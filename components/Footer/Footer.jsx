import Image from "next/image";
import Link from "next/link";

import logo from "../../public/images/logo.png";
import insta from "../../public/images/insta.png";
import tik from "../../public/images/tik.png";
import facebook from "../../public/images/facebook.png";

import "../Footer/Footer.css";
import NewsletterForm from "../NewsLetterForm/NewsLetterForm"
function Footer() {
  return (
    <div className="footer-contenant">
      <div className="footer-logo">
        <Image
          src={logo}
          alt="Logo Xpérience"
          width={200}
          height={200}
          className="contenant-header-logo"
          priority
        />
      </div>

      <div className="footer-a-propos">
        <h2 className="footer-apropos-title">À propos</h2>
        <ul className="footer-ul">
          <li>
            <Link href="/cgu">CGU</Link>
          </li>
          <li>
            <Link href="/cookies">Cookies et vie privée</Link>
          </li>
          <li>
            <Link href="/confidentialite">Politique de confidentialité</Link>
          </li>
          <li>
            <Link href="/mentions-legales">Mentions légales</Link>
          </li>
          <li>
            <Link href="/charte">La charte</Link>
          </li>
        </ul>
      </div>

      <div className="footer-contact">
        <NewsletterForm />
      </div>

      <div className="footer-reseau">
        <h2>Nos réseaux</h2>

        <div className="reseau">
          <a
            href="https://www.facebook.com/profile.php?id=61576828662100&locale=fr_FR"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook Xpérience (nouvel onglet)"
          >
            <Image
              src={facebook}
              alt="Facebook"
              width={50}
              height={50}
              className="footer-facebook"
            />
          </a>

          <a
            href="https://www.instagram.com/x.p.eriences/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram Xpérience (nouvel onglet)"
          >
            <Image
              src={insta}
              alt="Instagram"
              width={50}
              height={50}
              className="footer-insta"
            />
          </a>

          {/* <a
            href="https://www.tiktok.com/@xperiences1"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TikTok Xpérience (nouvel onglet)"
          >
            <Image
              src={tik}
              alt="TikTok"
              width={50}
              height={50}
              className="footer-tik"
            />
          </a> */}
        </div>

        {/* Liens internes : pas d'ouverture dans un nouvel onglet */}
        <Link href="/contact" className="footer-contact-link">
          <h2>Nous contacter</h2>
        </Link>

        <Link href="/blog" className="footer-contact-link">
          <h2>Notre blog</h2>
        </Link>
      </div>
    </div>
  );
}

export default Footer;
