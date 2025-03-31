import logo from "@/app/Assets/logo.png"
import Image from "next/image";
import insta from "@/app/Assets/insta.png"
import facebook from "@/app/Assets/facebook.png"
import "@/Components/Footer/Footer.css"
function Footer(params) {
    return(
        <div className="footer-contenant">
            <div className="footer-logo">
                <Image
                    src={logo}
                    alt="logo de xpérience"
                    width={200}
                    className="contenant-header-logo"
                />
            </div>
            <div className="footer-a-propos">
                <h2 className="footer-apropos-title">À PROPOS</h2>
                <ul className="footer-ul">
                    <li>CGU</li>
                    <li>Cookies et vie privée</li>
                    <li>Politique de confidentialité</li>
                    <li>Mentions légales</li>
                    <li>La charte</li>
                </ul>
            </div>
            <div className="footer-contact"><h2>Nous Contacter</h2></div>
            <div className="footer-reseau">
                <h2>Nos réseaux</h2>
                <a href="">
                    <Image
                        src={facebook}
                        alt="liens facebook"
                        width={50}
                        className="footer-facebook"
                    />
                </a>
                <a href="">
                    <Image
                        src={insta}
                        alt="liens insta"
                        width={50}
                        className="footer-insta"
                    />
                </a>
            </div>
        </div>
    )
}
export default Footer   