import { Suspense, useEffect } from "react";
import { ToastContainer } from "react-toastify";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Aos from "aos";
import Hello from "./components/Hello";
const Layout = () => {
    useEffect(() => {
        Aos.init({ duration: 1000 });
    }, []);
    return (
        <>
            <Suspense fallback={<div>Loading...</div>}>
                <ToastContainer
                    position="top-right"
                    autoClose={5000}
                    hideProgressBar={false}
                    newestOnTop={false}
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="light"
                />
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<Hello />} />
                    </Routes>
                </BrowserRouter>
            </Suspense>
        </>
    )
}
export default Layout;