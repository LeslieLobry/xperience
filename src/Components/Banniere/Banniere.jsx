import React from "react"; 
import "@/Components/Banniere/Banniere.css"
import Image from "next/image";

function Banniere({image, title}) {
    return (
        <div className="baniere-components">
           <div className="baniere-img">
           <Image 
            src={image}
            alt="Image plein écran"
            fill
            style={{ objectFit: "cover" }}
            priority
            />
           </div>
           <div className="baniere-text">
            <h1><span>{title}</span></h1>
           </div>
        </div>)
}

export default Banniere