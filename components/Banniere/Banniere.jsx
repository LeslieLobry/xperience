import React from "react"; 
import "../Banniere/Banniere.css";
import Image from "next/image";

function Banniere({ image, title }) {
    return (
        <div className="baniere-components">
            <div className="baniere-img">
                <Image 
                    src={image}
                    alt="Bannière"
                    width={1920} 
                    height={500} 
                    style={{ width: "100%", height: "" }} 
                    priority
                />
                <div className="baniere-text">
                    <h1><span>{title}</span></h1>
                </div>
            </div>
        </div>
    );
}

export default Banniere;