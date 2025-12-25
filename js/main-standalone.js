/**
 * Quation QR Tracker - Standalone JavaScript
 */

(function () {
    "use strict";

    // QR Code Parser
    const QRParser = {
        parse: function (qrData) {
            if (!qrData || qrData.length < 13) {
                throw new Error("Invalid QR code data");
            }

            // Reference number: first 13 characters, adding (-) before FG
            let referenceNumber = qrData.substring(0, 13);
            
                referenceNumber = referenceNumber.substring(0,7) + "-" + referenceNumber.substring(7);
            

            // Best Before Date: positions 14-17 (0-indexed: 13-16)
            let bbd = null;
            let bbdFormatted = null;
            if (qrData.length >= 17) {
                const month = qrData.substring(13, 15);
                const year = qrData.substring(15, 17);
                const fullYear = `20${year}`;
                const monthNum = parseInt(month, 10);

                if (monthNum >= 1 && monthNum <= 12) {
                    const monthNames = [
                        "January",
                        "February",
                        "March",
                        "April",
                        "May",
                        "June",
                        "July",
                        "August",
                        "September",
                        "October",
                        "November",
                        "December",
                    ];
                    bbdFormatted = `${monthNames[monthNum - 1]} ${fullYear}`;
                    bbd = new Date(fullYear, monthNum - 1, 1);
                }
            }

            // Product: positions 16-25
            let product = null;
            if (qrData.length >= 16) {
                product = qrData.substring(17, Math.min(25, qrData.length));
            }

            return {
                referenceNumber,
                bbd,
                bbdFormatted,
                product: product || "N/A",
                rawData: qrData,
            };
        },

        getStatus: function (bbd) {
            if (!bbd) return "UNKNOWN";

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const bbdEnd = new Date(bbd.getFullYear(), bbd.getMonth() + 1, 0);
            bbdEnd.setHours(23, 59, 59, 999);

            return today > bbdEnd ? "BAD" : "GOOD";
        },
    };

    // Manufacturer Info
    const MANUFACTURER = {
        name: "Edesia Nutrition",
        address: "550 Romano Vineyard Way",
        city: "North Kingstown, RI 02852",
    };

    // QR Scanner Handler
    const QRScanner = {
        scanner: null,
        isScanning: false,
        hasScanned: false,

        init: function () {
            const scanBtn = document.getElementById("scan-btn");
            if (scanBtn) {
                scanBtn.addEventListener("click", () => {
                    const resultsDiv = document.getElementById("results-page");
                    if (resultsDiv && resultsDiv.style.display !== "none")
                        resultsDiv.style.display = "none";
                    const cameraDiv = document.getElementById("qr-reader");
                    cameraDiv.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                    });
                    this.start();
                });
            }
        },

        start: async function () {
            try {
                this.isScanning = true;
                this.hasScanned = false;

                const qrReader = document.getElementById("qr-reader");
                if (!qrReader) {
                    throw new Error("Scanner element not found");
                }

                // await new Promise((resolve) => setTimeout(resolve, 200));

                if (typeof Html5Qrcode === "undefined") {
                    throw new Error("QR Scanner library not loaded");
                }

                this.scanner = new Html5Qrcode("qr-reader");

                let cameras = [];
                try {
                    cameras = await Html5Qrcode.getCameras();
                    console.log("Available cameras:", cameras);
                } catch (err) {
                    console.warn("Could not enumerate cameras:", err);
                }

                const configsToTry = [];
                if (cameras.length > 0) {
                    const backCamera = cameras.find(
                        (device) =>
                            device.label?.toLowerCase().includes("back") ||
                            device.label?.toLowerCase().includes("rear") ||
                            device.label?.toLowerCase().includes("environment")
                    );
                    if (backCamera) {
                        configsToTry.push({
                            deviceId: { exact: backCamera.id },
                        });
                    }
                    configsToTry.push({ deviceId: { exact: cameras[0].id } });
                }
                configsToTry.push({ facingMode: "environment" });
                configsToTry.push({ facingMode: "user" });

                let lastError = null;
                for (const config of configsToTry) {
                    try {
                        console.log("Trying camera config:", config);
                        await this.scanner.start(
                            config,
                            {
                                fps: 10,
                                // qrbox: { width: 250, height: 250 },
                            },
                            (decodedText) => {
                                console.log("QR Code scanned:", decodedText);
                                this.onScanSuccess(decodedText);
                            },
                            (errorMessage) => {
                                // Ignore scanning errors
                            }
                        );
                        console.log("Camera started successfully!");
                        return;
                    } catch (err) {
                        console.log("Camera config failed:", config, err);
                        lastError = err;
                        try {
                            await this.scanner.stop().catch(() => {});
                            await this.scanner.clear().catch(() => {});
                        } catch (e) {}
                    }
                }

                throw (
                    lastError || new Error("All camera configurations failed")
                );
            } catch (err) {
                console.error("Camera error:", err);
                this.showError(err);
                this.isScanning = false;
            }
        },

        stop: async function () {
            if (this.scanner) {
                try {
                    await this.scanner.stop();
                    await this.scanner.clear();
                } catch (err) {
                    console.error("Error stopping scanner:", err);
                }
                this.scanner = null;
            }
            this.isScanning = false;
        },

        onScanSuccess: function (qrData) {
            if (this.hasScanned) return;
            this.hasScanned = true;
            this.stop();
            showResults(qrData);
        },

        showError: function (err) {
            const errorDiv = document.getElementById("error-message");
            const errorText = document.getElementById("error-text");

            let message = "Failed to start camera. ";

            if (
                err.name === "NotAllowedError" ||
                err.message?.includes("permission")
            ) {
                message +=
                    "Camera permission denied. Please allow camera access in your browser and try again.";
            } else if (
                err.name === "NotFoundError" ||
                err.message?.includes("no camera")
            ) {
                message +=
                    "No camera found. Please ensure a camera is connected.";
            } else if (
                err.message?.includes("HTTPS") ||
                err.message?.includes("secure context")
            ) {
                message +=
                    "Camera access requires HTTPS. Please use a secure connection.";
            } else {
                message += `Error: ${
                    err.message || err.name || "Unknown error"
                }. Please check camera permissions.`;
            }

            errorText.textContent = message;
            errorDiv.style.display = "block";
        },
    };

    // Form Handler
    const FormHandler = {
        init: function () {
            const input = document.getElementById("reference-input");
            const resultsDiv = document.getElementById("results-page");
            input.addEventListener("input", () => {
                if (resultsDiv && resultsDiv.style.display !== "none")
                    resultsDiv.style.display = "none";
            });
            const form = document.getElementById("qr-form");
            if (form) {
                form.addEventListener("submit", (e) => {
                    e.preventDefault();
                    const qrData = input.value.trim();
                    const resultsDiv =
                    document.getElementById("error-display");
                    resultsDiv.style.display = "block";
                    if (qrData.length < 21 || qrData.length > 25) {
                        if (resultsDiv) {
                            resultsDiv.innerHTML = `
                        <div class="error-message">
                            <p>Invalid QR code data. Please try again.</p>
                            </div>
                            `;
                            resultsDiv.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                            });
                        }
                    } else {
                        resultsDiv.style.display = "none";
                        showResults(qrData);
                    }
                });
            }
        },
    };

    // Results Renderer
    const ResultsRenderer = {
        render: function (qrData) {
            try {
                const parsed = QRParser.parse(qrData);
                console.log(parsed)
                const status = QRParser.getStatus(parsed.bbd);
                const isMobile = window.innerWidth <= 768;

                const html = isMobile
                    ? this.renderMobile(parsed, status)
                    : this.renderDesktop(parsed, status);

                const resultsDiv = document.getElementById("results-display");
                if (resultsDiv) {
                    resultsDiv.innerHTML = html;
                }
                
                // Show results page, hide landing page
                document.getElementById("landing-page").style.display = "none";
                document.getElementById("results-page").style.display = "block";

                document.getElementById("results-page").style.margin =
                    "40px auto";
                document.getElementById("results-page").style.padding = "20px";

                // Auto-refresh after 180 seconds
            } catch (err) {
                console.error("Error rendering results:", err);
                const resultsDiv = document.getElementById("results-page");
                resultsDiv.style.display = "block";
                if (resultsDiv) {
                    resultsDiv.innerHTML = `
                        <div class="error-message">
                            <p>Invalid QR code data. Please try again.</p>
                        </div>
                    `;
                    resultsDiv.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                    });
                }
            }
        },

        renderMobile: function (parsed, status) {
            const headerClass = status === "GOOD" ? "good" : "bad";
            return `
                <div class="results-card mobile-view">
                    <div class="results-header ${headerClass}" style="background: ${status === "GOOD" ? "#4CAF50" : "#f44336"}; color: #fff">${status}</div>
                    <div class="results-content">
                        <div class="info-row">
                            <div class="info-label">PRODUCT</div>
                            <div class="info-value" style="font-size: 1.6rem;">${parsed.product.toUpperCase()}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">REFERENCE NUMBER</div>
                            <div class="info-value" style="font-size: 1.6rem;">${
                                parsed.referenceNumber.toUpperCase()
                            }</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">BEST BEFORE DATE</div>
                            <div class="info-value" style="font-size: 1.6rem;">${
                                parsed.bbdFormatted || "N/A"
                            }</div>
                        </div>
                        <div class="info-row manufacturer-info">
                            <div class="info-label">Manufactured By</div>
                            <div class="info-value" style="font-size: 1.6rem;">
                                ${MANUFACTURER.name}
                            </div>
                            <div class="info-value" style="margin-top: 10px;">${
                                MANUFACTURER.address
                            }</div>
                            <div class="info-value">${MANUFACTURER.city}</div>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: center;margin-top: 1rem; border-top: 1px solid #eee;">
                        <button onclick="goHome()" class="btn btn-primary btn-home" style="width: fit-content; background: #83B241; font-family: 'New Spirit'; height: 2.5rem">
                        <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="48" height="108" viewBox="0 0 32 32"
style="fill:#FFFFFF; width: 1.4rem;">
<path d="M 16 2.59375 L 15.28125 3.28125 L 2.28125 16.28125 L 3.71875 17.71875 L 5 16.4375 L 5 28 L 14 28 L 14 18 L 18 18 L 18 28 L 27 28 L 27 16.4375 L 28.28125 17.71875 L 29.71875 16.28125 L 16.71875 3.28125 Z M 16 5.4375 L 25 14.4375 L 25 26 L 20 26 L 20 16 L 12 16 L 12 26 L 7 26 L 7 14.4375 Z"></path>
</svg> Scan More</button></div>
                    </div>
                </div>
            `;
        },

        renderDesktop: function (parsed, status) {
            const statusClass = status === "GOOD" ? "good" : "bad";
           
            return `
            <div>
        <div
            style="
                display: flex;
                align-items: center;
                flex-direction: column;
                
            "
        >

            <div style="width: 60%; display: flex; flex-direction: column; align-items: center;">
            <div style="display: flex; align-items: center; width: 100%; padding: 1rem 0px">
                <div style="width: 50%; padding-left: 1rem;">

                    <img style="width: 6rem;"  src="./desktop Box.png"/>
                </div>
                <div style="width: 50% !important;">
                    <p >Reference Number</p>
                    <div  >${
                        parsed.referenceNumber.toUpperCase()
                    }</div>
                </div>
            </div>
            <div style="display: flex; align-items: center; width: 100%; padding: 1rem 0px">
                <p style="width: 50%;">Status:</p>
                <span style="width: 50%; font-size: 2rem;" class="${statusClass}">${status}</span>
            </div>
            <div style="display: flex; align-items: center; width: 100%; ">
                
                <p style="width: 50%;">Product</p>
                <p style="width: 50%; font-size: 1.6rem" >
                    ${parsed.product.toUpperCase()}
                </p>
            </div>
            <div style="display: flex; align-items: center; width: 100%; padding: 1rem 0px">
                
                    <p style="width: 50%;">
                        Best Before Date
                    </p>
                    <p style="width: 50%;" >
                        ${parsed.bbdFormatted || "N/A"}
                    </p>
                </div>
            
                <div style="display: flex; align-items: center; width: 100%; margin-top: 4rem">

                    <p style="">
                        Manufacturer By
                    </p>
                </div>
            <div style="display: flex; align-items: center; width: 100%; ">
                <div style=" width: 20%; display: flex; align-items: center; justify-content: center;">
                    <img style="width: 7.5rem; margin-top: 1rem;" src="./edesia 1.png"/>
                </div>
                <div
                    style="display: flex; flex-direction: column; gap: 5px; padding-left: 3rem;"
                >
                    <p  style="font-size: 1.6rem;">
                        ${MANUFACTURER.name}
                    </p>
                    <p >${MANUFACTURER.address}</p>
                    <p >${MANUFACTURER.city}</p>
                </div>
            </div>
            </div>
        </div>
            <div style="display: flex; justify-content: end; width: 80%;">
            <button onclick="goHome()" style="border: none; background-color: #fff;display: flex; flex-direction: column; justify-content: center;cursor: pointer; align-items: center; font-family: 'New Spirit';">
                <img src="./home.png" style="width: 2rem; height: 2rem;"/>
                  Scan More
                </button>
                </div>
        </div>
        </div>
        `;
        },
    };

    // Global functions
    window.showResults = function (qrData) {
        ResultsRenderer.render(qrData);
    };

    window.goHome = function () {
        document.getElementById("landing-page").style.display = "block";
        document.getElementById("results-page").style.display = "none";
        document.getElementById("reference-input").value = "";
        if (QRScanner.scanner) {
            QRScanner.stop();
            QRScanner.hasScanned = false;
        }
    };

    window.toggleTroubleshooting = function () {
        const content = document.getElementById("troubleshooting-content");
        if (content) {
            content.classList.toggle("active");
        }
    };

    // Initialize on DOM ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    function init() {
        QRScanner.init();
        FormHandler.init();
        setTimeout(() => {
            window.location.reload();
        }, 180000);

        // Check if we have QR data in URL
        const urlParams = new URLSearchParams(window.location.search);
        const qrData = urlParams.get("qr");
        if (qrData) {
            showResults(qrData);
        }
    }
})();
