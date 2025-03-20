import logo from "@/app/Assets/logo.png"
import Image from "next/image";
function Footer(params) {
    return(
        <div className="footer-contenant">
            <div className="footer-logo">
                <Image
                    src={logo}
                    alt="logo de xpérience"
                    width={200}
                    className="contenant-header-logo"
                />
            </div>
        </div>
    )
}
export default Footer