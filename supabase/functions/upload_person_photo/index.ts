import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ✅ Export par défaut (requis par ton serveur)
export default async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with SERVICE ROLE (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create client with user's JWT to verify authentication
    // Note: RPC functions in public schema access family_tree internally
    const jwt = authHeader.replace("Bearer ", "");
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Verify user authentication
    const { data: userData, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !userData.user) {
      console.error("❌ Invalid user:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid user authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    console.log("✅ User authenticated:", userId);

    // Parse JSON body (React Native sends base64 as JSON)
    const body = await req.json();
    const fileBase64 = body.file_base64 as string;
    const fileName = body.file_name as string;
    const mimeType = body.mime_type as string;
    const treeId = body.tree_id as string;
    const personId = body.person_id as string;

    if (!fileBase64 || !treeId || !personId) {
      return new Response(
        JSON.stringify({ 
          error: "Missing parameters",
          received: { 
            hasFileBase64: !!fileBase64, 
            treeId: treeId || null, 
            personId: personId || null 
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📦 Received upload request:", {
      fileName,
      mimeType,
      treeId,
      personId,
      base64Length: fileBase64.length
    });

    // Decode base64 to Uint8Array
    const base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, '');
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    console.log("🔄 Decoded base64 to", bytes.length, "bytes");

    // Create File from Uint8Array
    const file = new File([bytes], fileName || "photo.jpg", { type: mimeType || "image/jpeg" });

    // Verify user is member of the tree (security check)
    // Use RPC function to access family_tree schema
    console.log("🔍 Checking if user is member of tree:", treeId, "userId:", userId);
    
    const { data: userTrees, error: treesError } = await supabaseUser
      .rpc("get_user_trees", { p_user_id: userId });

    console.log("📋 get_user_trees result:", { 
      trees: userTrees?.length || 0, 
      error: treesError?.message || null,
      treeIds: userTrees?.map((t: any) => ({ id: t.id, name: t.name, role: t.role })) || []
    });

    if (treesError) {
      console.error("❌ Error checking tree membership:", treesError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to verify tree membership",
          details: treesError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userTrees || userTrees.length === 0) {
      console.error("❌ User has no trees");
      return new Response(
        JSON.stringify({ error: "User is not a member of any tree" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isMember = userTrees.some((t: any) => t.id === treeId);
    
    if (!isMember) {
      console.error("❌ User is not a member of tree:", treeId);
      console.error("❌ User trees:", userTrees.map((t: any) => ({ id: t.id, name: t.name, role: t.role })));
      return new Response(
        JSON.stringify({ 
          error: "User is not a member of this tree",
          userTrees: userTrees.map((t: any) => t.id)
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userTree = userTrees.find((t: any) => t.id === treeId);
    console.log("✅ User is member with role:", userTree?.role);

    // Verify person belongs to the tree using RPC function
    const { data: personTreeId, error: personTreeError } = await supabaseUser
      .rpc("get_person_tree_id", { p_person_id: personId });

    if (personTreeError || !personTreeId || personTreeId !== treeId) {
      console.error("❌ Person does not belong to tree:", { personId, treeId, personTreeId });
      return new Response(
        JSON.stringify({ error: "Person does not belong to this tree" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Person belongs to tree");

    // Generate unique filename
    const extension = file.name.split(".").pop() || "jpg";
    const uniqueFileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const storagePath = `${treeId}/${personId}/${uniqueFileName}`;

    console.log("📸 Uploading to storage:", storagePath, "size:", file.size, "type:", file.type);

    // Upload to Supabase Storage using SERVICE ROLE (bypasses RLS)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("family-tree-media")
      .upload(storagePath, file, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("❌ Upload error:", uploadError);
      return new Response(
        JSON.stringify({ 
          error: "Upload failed",
          details: uploadError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Photo uploaded successfully:", uploadData);

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from("family-tree-media")
      .getPublicUrl(storagePath);

    return new Response(
      JSON.stringify({ 
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        success: true 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (e) {
    console.error("❌ Server error:", e);
    return new Response(
      JSON.stringify({ 
        error: "Server error",
        message: e instanceof Error ? e.message : String(e)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};