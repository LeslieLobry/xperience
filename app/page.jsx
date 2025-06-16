// import Image from "next/image";
// import "../app/page.css";

// import { Crimson_Text } from "next/font/google";
// import Banniere from "../components/Banniere/Banniere";
// import Button from "../components/Button/Button";

// const crimsonText = Crimson_Text({
//   subsets: ["latin"],
//   weight: ["400", "600", "700"],
//   style: ["normal", "italic"],
//   display: "swap",
// });

// export default function Home() {
//   return (
//     <div className={crimsonText.className}>
//       <div className="contenant">
//         <div className="logo-contenant">
//           <Image
//             src="/images/xperience3.png"
//             alt="logo de xperience, plus sophistiqué"
//             width={300}
//             height={100}
//           />
//         </div>

//         <div className="masque-contenant">
//           <Image
//             src="/images/masque.png"
//             alt="masque"
//             width={650}
//             height={400}
//           />
//         </div>

//         <div className="text">
//           <p>
//             Découvrez une communauté où la liberté et le désir se rencontrent.
//             Exprimez-vous sans tabou, seul, en couple ou à plusieurs, et vivez
//             des moments uniques avec des personnes qui partagent vos envies.
//             Ici, chaque connexion est une invitation à l’inattendu.
//           </p>
//         </div>

//         <div className="image-components">
//           <Banniere
//             title="Explorez les sensations. Vivez Xperiences."
//             image="/images/woman.jpg"
//           />
//           <Button
//             title="Inscription"
//             color="var(--primary-color)"
//             href="/inscription"
//             style={{ position: "relative", marginTop: -50, zIndex: 1000 }}
//           />
//         </div>

//         <div className="text-bas">
//           <p>
//             Rejoignez une communauté exclusive où le respect et le plaisir sont
//             maîtres-mots.
//           </p>
//         </div>

//         <Banniere
//           title=""
//           image="/images/bannierehome.png"
//           style={{ objectFit: "", width: "100%", height: "auto" }}
//         />
//       </div>
//     </div>
//   );
// }
export default function Page() {
  return <h1>Bienvenue sur Xperience</h1>;
}
