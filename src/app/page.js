import Image from "next/image";
// import styles from "./page.module.css";

export default function Home() {
  return (
    
    <div className="bg-[#1a2536] text-white min-h-screen">
      {/* Header */}
      <header className="flex justify-between items-center p-6">
        <h1 className="text-4xl text-gold font-cursive">Xperience</h1>
        <div className="space-x-4">
          <button className="bg-gold text-[#1a2536] px-4 py-2 rounded-lg">Inscription</button>
          <button className="bg-[#5a3d31] text-white px-4 py-2 rounded-lg">Connexion</button>
        </div>
      </header>
    </div>    
  
  );
}
