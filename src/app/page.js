import Image from "next/image";
import "@/app/page.css";
import logo from "@/app/Assets/logo.png";
import xperience3 from "@/app/Assets/xperience3.png"
import masque from"@/app/Assets/masque.png";
import { Crimson_Text } from "next/font/google";
import Banniere from "@/Components/Banniere/Banniere"
import skin from "@/app/Assets/skin.jpg"
import woman from "@/app/Assets/woman.jpg"
import Button from "@/Components/Button/Button";

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
          <Button title="Inscription" color="var(--primary-color)"href="/inscription" />  
          <Button title="Connexion" color="#8c6a5d"href="/connexion" />  
          </div>
        </div>
        <div className="logo-contenant">
            <Image src={xperience3}
            alt="logo de xperience, plus sophistiqué">   
            </Image>
        </div>
        <div className="masque-contenant">
            <Image src={masque}
            alt="masque"
            width={650}></Image>
        </div>
        <div className="text">
         <p>Découvrez une communauté où la liberté et le désir se rencontrent. 
          Exprimez-vous sans tabou, seul, en couple ou à plusieurs, et vivez des moments uniques avec des personnes qui partagent vos envies.
           Ici, chaque connexion est une invitation à l’inattendu.
          </p> 
        </div>
        <div className="image-components">
        <Banniere title ='Explorez les sensations. Vivez X’perience.' image={woman}></Banniere>
         <Button title="Inscription" color="var(--primary-color)"href="/inscription"/>  
        </div>
      </div>
    </div>
  );
}
