// components/Banniere/Banniere.jsx
import "../Banniere/Banniere.css";

export default function Banniere({ image, title, style }) {
  return (
    <div
      className="banniere"
      style={{
        backgroundImage: `url(${image.src})`,
        ...style,
      }}
    >
      {title && (
        <div className="banniere-text">
          <h1>{title}</h1>
        </div>
      )}
    </div>
  );
}
