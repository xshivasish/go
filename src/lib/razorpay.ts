export function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    const existingScript = document.getElementById("razorpay-checkout-js");

    if (existingScript) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}
