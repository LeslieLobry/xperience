// import Image from "next/image";
import "../app/page.css";

// import xperience3 from "../public/images/xperience3.png"
// import masque from "../public/images//masque.png";
import { Crimson_Text } from "next/font/google";
// import Banniere from "../components/Banniere/Banniere"
// import woman from "../public/images/woman.jpg"
// import Button from "../components/Button/Button";
// import bannierehome from "../public/images/bannierehome.png"
const crimsonText = Crimson_Text({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export default function Home() {
  return (
    <div className={crimsonText.className}>
      {/* <div className="contenant">
        <div className="logo-contenant">
           <Image src="/images/xperience3.png" alt="logo de xperience" width={200} height={100} />
        </div>
        <div className="masque-contenant">
            
        </div> */}
        {/* <div className="text">
          <p>Découvrez une communauté où la liberté et le désir se rencontrent. 
          Exprimez-vous sans tabou, seul, en couple ou à plusieurs, et vivez des moments uniques avec des personnes qui partagent vos envies.
          Ici, chaque connexion est une invitation à l’inattendu.
          </p> 
        </div>
        <div className="image-components">
        <Banniere title ='Explorez les sensations. Vivez Xperiences.' image={woman}></Banniere>
        <Button   title="Inscription"  color="var(--primary-color)"  href="/inscription"  style={{ position: 'relative', marginTop: -50, zIndex: 1000,  }}/>
        </div>
        <div className="text-bas"><p>Rejoignez une communauté exclusive où le respect et le plaisir sont maîtres-mots.</p></div>
      <Banniere title='' image={bannierehome}style={{ objectFit: "", width: "100%", height: "auto" }} ></Banniere>
    </div>  */}
    </div>
  );
}

