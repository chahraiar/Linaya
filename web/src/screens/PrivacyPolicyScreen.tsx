import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './PrivacyPolicyScreen.css';

const PrivacyPolicyScreen = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="privacy-policy-screen">
      <div className="privacy-policy-container">
        <header className="privacy-policy-header">
          <button onClick={() => navigate(-1)} className="btn-back">
            ← {t('common.back')}
          </button>
          <h1>{t('privacy.title')}</h1>
        </header>

        <div className="privacy-policy-content">
          <section>
            <h2>1. Introduction</h2>
            <p>
              La présente Politique de Confidentialité décrit la manière dont Linaya ("nous", "notre", "nos") 
              collecte, utilise et protège vos informations personnelles lorsque vous utilisez notre service 
              d'arbre généalogique accessible sur https://linaya.la-saint-quentinoise.fr/ (le "Service").
            </p>
            <p>
              En utilisant notre Service, vous acceptez la collecte et l'utilisation d'informations conformément 
              à cette politique.
            </p>
          </section>

          <section>
            <h2>2. Informations que nous collectons</h2>
            <h3>2.1 Informations d'authentification</h3>
            <p>
              Lors de votre inscription, nous collectons :
            </p>
            <ul>
              <li>Votre adresse e-mail</li>
              <li>Votre mot de passe (stocké de manière sécurisée et cryptée)</li>
              <li>Les informations de votre compte Facebook ou Google si vous choisissez de vous connecter via ces services</li>
            </ul>

            <h3>2.2 Données généalogiques</h3>
            <p>
              Vous pouvez choisir de nous fournir des informations sur votre famille, notamment :
            </p>
            <ul>
              <li>Noms et prénoms</li>
              <li>Dates de naissance et de décès</li>
              <li>Relations familiales</li>
              <li>Photographies et médias</li>
              <li>Notes et informations supplémentaires</li>
            </ul>
          </section>

          <section>
            <h2>3. Utilisation des informations</h2>
            <p>Nous utilisons les informations collectées pour :</p>
            <ul>
              <li>Fournir, maintenir et améliorer notre Service</li>
              <li>Gérer votre compte et vos arbres généalogiques</li>
              <li>Permettre le partage de vos arbres avec d'autres utilisateurs que vous autorisez</li>
              <li>Vous contacter concernant votre compte ou le Service</li>
              <li>Détecter et prévenir les fraudes et abus</li>
            </ul>
          </section>

          <section>
            <h2>4. Partage des informations</h2>
            <p>
              Nous ne vendons, ne louons ni ne partageons vos informations personnelles avec des tiers, 
              sauf dans les cas suivants :
            </p>
            <ul>
              <li>
                <strong>Partage autorisé :</strong> Vous pouvez choisir de partager votre arbre généalogique 
                avec d'autres utilisateurs. Ces utilisateurs auront accès aux informations que vous avez partagées.
              </li>
              <li>
                <strong>Fournisseurs de services :</strong> Nous pouvons partager des informations avec des 
                prestataires de services tiers qui nous aident à exploiter notre Service (hébergement, base de données, etc.).
              </li>
              <li>
                <strong>Obligations légales :</strong> Nous pouvons divulguer vos informations si la loi l'exige 
                ou en réponse à une demande légale valide.
              </li>
            </ul>
          </section>

          <section>
            <h2>5. Sécurité des données</h2>
            <p>
              Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos informations personnelles 
              contre l'accès non autorisé, la modification, la divulgation ou la destruction. Cependant, 
              aucune méthode de transmission sur Internet ou de stockage électronique n'est totalement sécurisée.
            </p>
            <p>
              Vos données sont stockées sur des serveurs sécurisés et l'accès est contrôlé par authentification.
            </p>
          </section>

          <section>
            <h2>6. Vos droits</h2>
            <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous avez le droit de :</p>
            <ul>
              <li>Accéder à vos données personnelles</li>
              <li>Corriger vos données personnelles inexactes</li>
              <li>Demander la suppression de vos données personnelles</li>
              <li>Vous opposer au traitement de vos données personnelles</li>
              <li>Demander la portabilité de vos données</li>
              <li>Retirer votre consentement à tout moment</li>
            </ul>
            <p>
              Pour exercer ces droits, contactez-nous à l'adresse indiquée dans la section "Contact" ci-dessous.
            </p>
          </section>

          <section>
            <h2>7. Conservation des données</h2>
            <p>
              Nous conservons vos données personnelles aussi longtemps que nécessaire pour fournir le Service 
              et respecter nos obligations légales. Si vous supprimez votre compte, nous supprimerons vos 
              données personnelles dans un délai raisonnable, sauf si la loi nous oblige à les conserver.
            </p>
          </section>

          <section>
            <h2>8. Cookies et technologies similaires</h2>
            <p>
              Nous utilisons des cookies et des technologies similaires pour améliorer votre expérience, 
              analyser l'utilisation du Service et personnaliser le contenu. Vous pouvez configurer votre 
              navigateur pour refuser les cookies, mais cela peut affecter certaines fonctionnalités du Service.
            </p>
          </section>

          <section>
            <h2>9. Modifications de cette politique</h2>
            <p>
              Nous pouvons mettre à jour cette Politique de Confidentialité de temps à autre. Nous vous 
              informerons de tout changement en publiant la nouvelle politique sur cette page et en 
              mettant à jour la date de "Dernière mise à jour".
            </p>
            <p>
              Il est conseillé de consulter régulièrement cette page pour prendre connaissance de toute modification.
            </p>
          </section>

          <section>
            <h2>10. Contact</h2>
            <p>
              Pour toute question concernant cette Politique de Confidentialité, vous pouvez nous contacter :
            </p>
            <ul>
              <li>Par e-mail : contact@la-saint-quentinoise.fr</li>
              <li>Via notre site web : https://linaya.la-saint-quentinoise.fr/</li>
            </ul>
          </section>

          <section className="last-updated">
            <p>
              <strong>Dernière mise à jour :</strong> {new Date().toLocaleDateString('fr-FR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyScreen;

