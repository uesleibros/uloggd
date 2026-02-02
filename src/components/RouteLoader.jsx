import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import NProgress from "nprogress";

NProgress.configure({
  trickle: false,
  showSpinner: false,
});

export default function RouteLoader() {
  const location = useLocation();

  useEffect(() => {
    NProgress.start();

    const timeout = setTimeout(() => {
      NProgress.done();
    }, 200);

    return () => {
      clearTimeout(timeout);
      NProgress.done();
    }
  }, [location.pathname]);

  return null;
}