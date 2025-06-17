import logo from "../../public/images/logo.png"
import Image from "next/image";
import insta from "../../public/images/insta.png"
import tik from "../../public/images/tik.png"
import facebook from "../../public/images/facebook.png"
import Link from "next/link";
import "../Footer/Footer.css"
import NewsletterForm from "../NewsLetterForm/NewsLetterForm";
function Footer(params) {
return(
<div className="footer-contenant">
    <div className="footer-logo">
        <Image src={logo} alt="logo de xpérience" width={200} height={200} className="contenant-header-logo" />
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
        <Link href="/contact"  target="_blank" rel="noopener noreferrer" className="footer-contact-link">
         <h2>Nous Contacter</h2>
        </Link>

        <NewsletterForm />
    </div>
    <div className="footer-reseau">
  <h2>Nos réseaux</h2>

  <a
    href="https://www.facebook.com/profile.php?id=61576828662100&locale=fr_FR"
    target="_blank"
    rel="noopener noreferrer"
  >
    <Image src={facebook} alt="Facebook" width={50} className="footer-facebook" />
  </a>

  <a
    href="https://www.instagram.com/x.p.eriences/"
    target="_blank"
    rel="noopener noreferrer"
  >
    <Image src={insta} alt="Instagram" width={50} className="footer-insta" />
  </a>

  <a
    href="https://www.tiktok.com/@xperiences1"
    target="_blank"
    rel="noopener noreferrer"
  >
    <Image src={tik} alt="TikTok" width={50} className="footer-insta" />
  </a>
</div>

</div>
)
}
export default Footer