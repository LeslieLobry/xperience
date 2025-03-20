import React from "react";
import "@/Components/Button/Button.css";

function Button({ title, color }) {
  return (
    <button className="custom-button" style={{ backgroundColor: color }}>
      {title}
    </button>
  );
}

export default Button;
