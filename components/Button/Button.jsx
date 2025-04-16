import React from "react";
import Link from "next/link";
import "../Button/Button.css";

function Button({ title, color, href, style, onClick, type = "button" }) {
  const buttonContent = (
    <button
      className="custom-button"
      style={{ backgroundColor: color, ...style }}
      onClick={onClick}
      type={type}
    >
      {title}
    </button>
  );

  return href ? <Link href={href}>{buttonContent}</Link> : buttonContent;
}

export default Button;
