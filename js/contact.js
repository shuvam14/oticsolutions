/* ==========================================================================
   Otic Solutions Pvt. Ltd. - Contact Form Handler
   Validates the contact form and sends submissions to a Discord webhook.
   ========================================================================== */

// ⚠️ Replace this with your backend proxy endpoint in production
const CONTACT_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1543849503625453578/UuSr3IZoP-e-NUmx9BZ8chmrW5TphTpdiNY-oJXpaGxlCWRMWDrkXSTVakSA9Jx_MpT0";

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("contact-form")) {
    initContactForm();
  }
});

function initContactForm() {
  const form = document.getElementById("contact-form");
  const alertBox = document.getElementById("contact-alert");
  const submitBtn = form.querySelector('button[type="submit"]');
  const editBtn = document.getElementById("contact-edit-btn");
  const submitBtnDefaultHTML = submitBtn.innerHTML;
  const fields = form.querySelectorAll("input, textarea");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("contact-name").value.trim();
    const email = document.getElementById("contact-email").value.trim();
    const phone = document.getElementById("contact-phone").value.trim();
    const subject = document.getElementById("contact-subject").value.trim();
    const message = document.getElementById("contact-message").value.trim();

    if (!name || !email || !phone || !message) {
      showAlert(alertBox, "error", "Please fill in all required fields.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      showAlert(alertBox, "error", "Please enter a valid email address.");
      return;
    }

    const phoneDigits = phone.replace(/[^0-9]/g, "");
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      showAlert(alertBox, "error", "Please enter a valid phone number.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
    alertBox.style.display = "none";
    if (window.OticUI) OticUI.showLoader("Sending your message...");

    try {
      if (!navigator.onLine) {
        throw new Error("offline");
      }

      const response = await fetch(CONTACT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "🔔 New contact form received! <@&1543872808348549160>",
          embeds: [
            {
              title: "📩 New Contact Form Submission",
              color: 12981901,
              fields: [
                {
                  name: "> Name",
                  value: `\`\`\`${name}\`\`\``,
                  inline: true
                },
                {
                  name: "> Email",
                  value: `\`\`\`${email}\`\`\``,
                  inline: true
                },
                {
                  name: "> Phone",
                  value: `\`\`\`${phone}\`\`\``,
                  inline: true
                },
                {
                  name: "> Subject",
                  value: `\`\`\`${subject || "N/A"}\`\`\``,
                  inline: false
                },
                {
                  name: "> Message",
                  value: `\`\`\`${message}\`\`\``,
                  inline: false
                }
              ],
              footer: {
                text: "Otic Solutions Pvt. Ltd. — Website Contact Form"
              },
              timestamp: new Date().toISOString()
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook responded with status ${response.status}`);
      }

      showAlert(
        alertBox,
        "success",
        "Message sent! Thank you for contacting Otic Solutions Pvt. Ltd. — we will get back to you soon."
      );
      if (window.OticUI) OticUI.toast("Your message has been sent successfully.", "success");
      lockForm();
    } catch (err) {
      console.error("Otic Solutions: contact form submission failed:", err);
      const message =
        err && err.message === "offline"
          ? "Unable to connect right now. Please check your internet connection and try again."
          : "Something went wrong. Please try again or call us directly at 9851255871.";
      showAlert(alertBox, "error", message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = submitBtnDefaultHTML;
    } finally {
      if (window.OticUI) OticUI.hideLoader();
    }
  });

  if (editBtn) {
    editBtn.addEventListener("click", () => {
      unlockForm();
    });
  }

  function lockForm() {
    fields.forEach((field) => (field.disabled = true));
    submitBtn.style.display = "none";
    if (editBtn) editBtn.style.display = "inline-block";
  }

  function unlockForm() {
    fields.forEach((field) => (field.disabled = false));
    submitBtn.disabled = false;
    submitBtn.innerHTML = submitBtnDefaultHTML;
    submitBtn.style.display = "block";
    if (editBtn) editBtn.style.display = "none";
    alertBox.style.display = "none";
    document.getElementById("contact-name").focus();
  }
}

function showAlert(alertBox, type, message) {
  alertBox.className = `alert-message alert-${type}`;
  alertBox.style.display = "block";
  alertBox.textContent = message;
}