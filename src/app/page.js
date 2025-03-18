import Image from "next/image";
import "@/app/page.css";
import logo from "@/app/Assets/logo.png";
import xperience3 from "@/app/Assets/xperience3.png"
import { Crimson_Text } from "next/font/google";

const crimsonText = Crimson_Text({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export default function Home() {
  return (
    <div className={crimsonText.className}>
      <div className="contenant">
        <div className="contenant-header">
          <Image
            src={logo}
            alt="logo de xpérience"
            width={200}
            className="contenant-header-logo"
          />
          <div className="bouton-header">
            <button className="header-inscription">Inscription</button>
            <button className="header-connexion">Connexion</button>
          </div>
        </div>
        <div className="logo-contenant">
            <Image src={xperience3}
            alt="logo de xperience, plus sophistiqué">   
            </Image>
        </div>
      </div>
    </div>
  );
}
