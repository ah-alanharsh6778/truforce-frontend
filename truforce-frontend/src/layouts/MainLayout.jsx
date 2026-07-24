import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";

export default function MainLayout({ children }) {

    return (

        <div className="flex">

            <Sidebar />

            <div className="flex-1 bg-gray-100 min-h-screen">

                <Topbar />

                <div className="p-8">

                    {children}

                </div>

            </div>

        </div>
    );
}