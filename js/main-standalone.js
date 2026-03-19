(function () {
   "use strict";

   const app = document.getElementById("results-display");

   const MANUFACTURER = {
      name: "Edesia Nutrition",
      address: "550 Romano Vineyard Way",
      city: "North Kingstown, RI 02852",
   };

   function showError(message) {
      document.getElementById("results-page").style.display = "block";

      app.innerHTML = `
            <div class="error-message">
                <p>${message}</p>
            </div>
        `;
   }

   function parseURL() {
      const url = new URL(window.location.href);

      const product = url.searchParams.get("p");
      const batch = url.searchParams.get("b");
      const factory = url.searchParams.get("f");
      const line = url.searchParams.get("l");
      const bb = url.searchParams.get("bb");
      const pd = url.searchParams.get("pd");

      if (!product || !batch || !factory || !line || !bb) {
         throw new Error("Invalid QR code data. Please try again.");
      }

      const referenceRaw = `${batch}${factory}${line}`;
      const referenceNumber =
         referenceRaw.length >= 7
            ? referenceRaw.slice(0, 7) + "-" + referenceRaw.slice(7)
            : referenceRaw;

      let bbd = null;
      let bbdFormatted = "N/A";
      let status = "UNKNOWN";

      if (bb.length === 4) {
         const month = parseInt(bb.slice(0, 2), 10);
         const year = "20" + bb.slice(2);

         if (month >= 1 && month <= 12) {
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

            bbdFormatted = `${monthNames[month - 1]} ${year}`;
            bbd = new Date(year, month - 1, 1);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const end = new Date(year, month, 0);
            end.setHours(23, 59, 59, 999);

            status = today > end ? "BAD" : "GOOD";
         }
      }

      let productionDate = "N/A";

      if (pd && pd.length === 6) {
         const day = pd.slice(0, 2);
         const month = parseInt(pd.slice(2, 4), 10);
         const year = "20" + pd.slice(4);

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

         if (month >= 1 && month <= 12) {
            productionDate = `${day} ${monthNames[month - 1]} ${year}`;
         }
      }

      return {
         product,
         batch,
         factory,
         line,
         referenceNumber,
         bbd,
         bbdFormatted,
         productionDate,
      };
   }

   const ResultsRenderer = {
      render: function (parsed) {
         const status = getStatus(parsed.bbd);
         const isMobile = window.innerWidth <= 768;

         const html = isMobile
            ? this.renderMobile(parsed, status)
            : this.renderDesktop(parsed, status);

         document.getElementById("results-page").style.display = "block";
         app.innerHTML = html;
      },

      renderMobile: function (parsed, status) {
         const headerClass = status === "GOOD" ? "good" : "bad";

         return `
            <div class="results-card mobile-view">

            <div class="results-header ${headerClass}" style="background:${status === "GOOD" ? "#4CAF50" : "#f44336"};color:#fff">
            ${status}
            </div>

            <div class="results-content">

            <div class="info-row">
            <div class="info-label">PRODUCT</div>
            <div class="info-value" style="font-size:1.6rem;">
            ${parsed.product.toUpperCase()}
            </div>
            </div>

            <div class="info-row">
            <div class="info-label">BATCH</div>
            <div class="info-value" style="font-size:1.6rem;">
            ${parsed.batch || "N/A"}
            </div>
            </div>

            <div class="info-row">
            <div class="info-label">FG NUMBER</div>
            <div class="info-value" style="font-size:1.6rem;">
            ${parsed.factory || "N/A"}
            </div>
            </div>

            <div class="info-row">
            <div class="info-label">LINE</div>
            <div class="info-value" style="font-size:1.6rem;">
            ${parsed.line || "N/A"}
            </div>
            </div>

            <div class="info-row">
            <div class="info-label">BEST BY</div>
            <div class="info-value" style="font-size:1.6rem;">
            ${parsed.bbdFormatted || "N/A"}
            </div>
            </div>

            <div class="info-row">
            <div class="info-label">PRODUCTION DATE</div>
            <div class="info-value" style="font-size:1.6rem;">
            ${parsed.productionDate || "N/A"}
            </div>
            </div>

            <div class="info-row manufacturer-info">
            <div class="info-label">Manufactured By</div>

            <div class="info-value" style="font-size:1.6rem;">
            ${MANUFACTURER.name}
            </div>

            <div class="info-value" style="margin-top:10px;">
            ${MANUFACTURER.address}
            </div>

            <div class="info-value">
            ${MANUFACTURER.city}
            </div>
            </div>

            </div>
            </div>
            `;
      },

      renderDesktop: function (parsed, status) {
         const statusClass = status === "GOOD" ? "good" : "bad";

         return `
         <div style="display: flex;align-items: center;justify-content: center;height: 100%;">
            <div style="width: 60%;">
            <div style="display:flex;align-items:center;flex-direction:column;">
            <div style="width:60%;display:flex;flex-direction:column;align-items:center;">  
            <div style="display:flex;align-items:center;width:100%;padding:1rem 0px">
            <div style="width:50%;padding-left:1rem;">
            <img style="width:6rem;" src="./desktop Box.png"/>
            </div>
            </div>
            <div style="display:flex;align-items:center;width:100%;">
            <p style="width:50%;">Status</p>
            <div class="${statusClass}" style="width:50%;font-size:2rem;margin-bottom:0.9rem">
            ${status}
            </div>
            </div>
            <div style="display:flex;align-items:center;width:100%;">
            <p style="width:50%;">Product Name</p>
            <p style="width:50%;font-size:1.1rem;margin-bottom:0.6rem">${parsed.product}</p>
            </div> 
            <div style="display:flex;align-items:center;width:100%;">
            <p style="width:50%;">Batch</p>
            <p style="width:50%;font-size:1.1rem;margin-bottom:0.6rem">${parsed.batch || "N/A"}</p>
            </div>
            <div style="display:flex;align-items:center;width:100%;">
            <p style="width:50%;">FG Number</p>
            <p style="width:50%;font-size:1.1rem;margin-bottom:0.6rem">${parsed.factory || "N/A"}</p>
            </div>
            <div style="display:flex;align-items:center;width:100%;">
            <p style="width:50%;">Line</p>
            <p style="width:50%;font-size:1.1rem;margin-bottom:0.6rem">${parsed.line || "N/A"}</p>
            </div>
            <div style="display:flex;align-items:center;width:100%;">
            <p style="width:50%;">Best By</p>
            <p style="width:50%;font-size:1.1rem;margin-bottom:0.6rem">${parsed.bbdFormatted || "N/A"}</p>
            </div>
            <div style="display:flex;align-items:center;width:100%;">
            <p style="width:50%;">Production Date</p>
            <p style="width:50%;font-size:1.1rem;margin-bottom:0.6rem">${parsed.productionDate || "N/A"}</p>
            </div>
            <div style="display:flex;align-items:center;width:100%;margin-top:4rem">
            <p>Manufactured by:</p>
            </div>
            <div style="display:flex;align-items:center;width:100%;">
            <div style="width:20%;display:flex;align-items:center;justify-content:center;">
            <img style="width:7.5rem;margin-top:1rem;" src="./edesia 1.png"/>
            </div>
            <div style="display:flex;flex-direction:column;gap:5px;padding-left:3rem;">
            <p style="font-size:1.6rem;">${MANUFACTURER.name}</p>
            <p>${MANUFACTURER.address}</p>
            <p>${MANUFACTURER.city}</p>
            </div> 
            </div>
            </div>
            </div>
            </div>
            </div>
            `;
      },
   };

   function getStatus(bbd) {
      if (!bbd) return "UNKNOWN";

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const end = new Date(bbd.getFullYear(), bbd.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);

      return today > end ? "BAD" : "GOOD";
   }

   document.addEventListener("DOMContentLoaded", () => {
      try {
         const parsed = parseURL();
         ResultsRenderer.render(parsed);
      } catch (err) {
         showError(err.message);
      }
   });
})();
