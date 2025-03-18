import Image from "next/image";
// import styles from "./page.module.css";
import logo from "@/app/Assets/logo.png"

export default function Home() {
  return (
    
    <div className="contenant">
      <div className="contenant-header">
        <Image src={logo} alt="logo de xpérience" width={120} className="contenant-header-logo"></Image>
        <div className="bouton">
        <button className="header-inscrition">Inscription</button>
        <button className="header-connexion">Connexion</button>
        </div>
      </div>
    </div>
  
  );
}
