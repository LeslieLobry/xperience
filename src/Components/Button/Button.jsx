import React from "react";
import Link from "next/link";
import "@/Components/Button/Button.css";

function Button({ title, color, href }) {
  return (
    <Link href={href} passHref>
      <button className="custom-button" style={{ backgroundColor: color }}>
        {title}
      </button>
    </Link>
  );
}

export default Button