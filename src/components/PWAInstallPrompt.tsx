import { useState, useEffect } from "react";
import { Download, X, Share, Plus } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isIOS = () => {
    return (
        /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()) &&
        !(window as unknown as { MSStream?: unknown }).MSStream
    );
};

const isInStandaloneMode = () =>
    "standalone" in window.navigator &&
    (window.navigator as unknown as { standalone: boolean }).standalone;

export function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [showIOSPrompt, setShowIOSPrompt] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Don't show if already installed or previously dismissed
        const wasDismissed = localStorage.getItem("pwa-prompt-dismissed");
        if (wasDismissed) return;
        if (isInStandaloneMode()) return;

        // iOS doesn't fire beforeinstallprompt
        if (isIOS()) {
            setTimeout(() => setShowIOSPrompt(true), 3000);
            return;
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setTimeout(() => setShowPrompt(true), 3000);
        };

        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setShowPrompt(false);
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        setShowIOSPrompt(false);
        setDismissed(true);
        localStorage.setItem("pwa-prompt-dismissed", "true");
    };

    if (dismissed) return null;

    // Android / Chrome – native install prompt
    if (showPrompt) {
        return (
            <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-500">
                <div
                    style={{
                        background:
                            "linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(15,15,15,0.95) 100%)",
                        border: "1px solid rgba(249,115,22,0.4)",
                        backdropFilter: "blur(16px)",
                        borderRadius: "16px",
                        padding: "16px",
                        boxShadow:
                            "0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(249,115,22,0.1)",
                    }}
                >
                    <button
                        onClick={handleDismiss}
                        className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
                        aria-label="Dismiss"
                    >
                        <X size={16} />
                    </button>

                    <div className="flex items-center gap-3 mb-3">
                        <div
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 12,
                                overflow: "hidden",
                                flexShrink: 0,
                                border: "2px solid rgba(249,115,22,0.5)",
                            }}
                        >
                            <img
                                src="/preorder_logo.jpg"
                                alt="Preorder"
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                        </div>
                        <div>
                            <p
                                style={{
                                    color: "#fff",
                                    fontWeight: 700,
                                    fontSize: 15,
                                    margin: 0,
                                }}
                            >
                                Install Preorder App
                            </p>
                            <p
                                style={{
                                    color: "rgba(255,255,255,0.6)",
                                    fontSize: 12,
                                    margin: 0,
                                }}
                            >
                                Add to home screen for the best experience
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleDismiss}
                            style={{
                                flex: 1,
                                padding: "10px",
                                borderRadius: 10,
                                border: "1px solid rgba(255,255,255,0.15)",
                                background: "transparent",
                                color: "rgba(255,255,255,0.6)",
                                fontSize: 13,
                                cursor: "pointer",
                            }}
                        >
                            Not now
                        </button>
                        <button
                            onClick={handleInstall}
                            style={{
                                flex: 2,
                                padding: "10px",
                                borderRadius: 10,
                                border: "none",
                                background: "linear-gradient(135deg, #f97316, #ea580c)",
                                color: "#fff",
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                            }}
                        >
                            <Download size={14} />
                            Install App
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // iOS – manual instructions
    if (showIOSPrompt) {
        return (
            <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-500">
                <div
                    style={{
                        background:
                            "linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(15,15,15,0.95) 100%)",
                        border: "1px solid rgba(249,115,22,0.4)",
                        backdropFilter: "blur(16px)",
                        borderRadius: "16px",
                        padding: "16px",
                        boxShadow:
                            "0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(249,115,22,0.1)",
                    }}
                >
                    <button
                        onClick={handleDismiss}
                        className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
                        aria-label="Dismiss"
                    >
                        <X size={16} />
                    </button>

                    <div className="flex items-center gap-3 mb-3">
                        <div
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 12,
                                overflow: "hidden",
                                flexShrink: 0,
                                border: "2px solid rgba(249,115,22,0.5)",
                            }}
                        >
                            <img
                                src="/preorder_logo.jpg"
                                alt="Preorder"
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                        </div>
                        <div>
                            <p
                                style={{
                                    color: "#fff",
                                    fontWeight: 700,
                                    fontSize: 15,
                                    margin: 0,
                                }}
                            >
                                Install Preorder on iOS
                            </p>
                            <p
                                style={{
                                    color: "rgba(255,255,255,0.6)",
                                    fontSize: 12,
                                    margin: 0,
                                }}
                            >
                                Add to your home screen in 2 steps
                            </p>
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div className="flex items-center gap-2">
                            <div
                                style={{
                                    background: "rgba(249,115,22,0.2)",
                                    borderRadius: 8,
                                    padding: "6px 8px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    color: "#f97316",
                                    fontSize: 12,
                                }}
                            >
                                <Share size={14} />
                                <span>Tap the Share button</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div
                                style={{
                                    background: "rgba(249,115,22,0.2)",
                                    borderRadius: 8,
                                    padding: "6px 8px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    color: "#f97316",
                                    fontSize: 12,
                                }}
                            >
                                <Plus size={14} />
                                <span>Tap "Add to Home Screen"</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
