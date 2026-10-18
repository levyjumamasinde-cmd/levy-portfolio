const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Open navigation menu" : "Close navigation menu");
    navLinks.classList.toggle("is-open", !isOpen);
  });

  navLinks.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation menu");
      navLinks.classList.remove("is-open");
    }
  });
}

const year = document.querySelector("#year");
if (year) {
  year.textContent = String(new Date().getFullYear());
}

const resultSlipForm = document.querySelector("#result-slip-form");
const resultSlipInput = document.querySelector("#result-slip-passcode");
const resultSlipStatus = document.querySelector("#result-slip-status");
const resultSlipLink = document.querySelector("#result-slip-link");

if (
  resultSlipForm instanceof HTMLFormElement &&
  resultSlipInput instanceof HTMLInputElement &&
  resultSlipStatus instanceof HTMLElement &&
  resultSlipLink instanceof HTMLAnchorElement
) {
  const accessButton = resultSlipForm.querySelector('button[type="submit"]');
  const functionUrl =
    "https://mzwvccqmnmftpufdwxfs.supabase.co/functions/v1/authorize-result-slip";
  const publishableKey = "sb_publishable_zelkVNg1N5u0Cma3vfPStQ__KbmIAPE";
  let linkExpiryTimer;

  resultSlipForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!(accessButton instanceof HTMLButtonElement)) return;

    window.clearTimeout(linkExpiryTimer);
    resultSlipLink.hidden = true;
    resultSlipLink.removeAttribute("href");
    resultSlipStatus.textContent = "Checking passcode…";
    accessButton.disabled = true;

    try {
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          apikey: publishableKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ passcode: resultSlipInput.value }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          resultSlipStatus.textContent = "That passcode was not accepted.";
        } else if (response.status === 429) {
          resultSlipStatus.textContent = "Too many attempts. Please wait before trying again.";
        } else if (response.status >= 500) {
          resultSlipStatus.textContent = "Private access is temporarily unavailable. Please try again later.";
        } else {
          resultSlipStatus.textContent = "Could not verify the passcode. Please try again.";
        }
        return;
      }

      const result = await response.json();
      if (typeof result.signedUrl !== "string" || !result.signedUrl.startsWith("https://")) {
        resultSlipStatus.textContent = "Private access is temporarily unavailable. Please try again later.";
        return;
      }

      resultSlipLink.href = result.signedUrl;
      resultSlipLink.hidden = false;
      resultSlipStatus.textContent =
        "Passcode accepted. The private link expires in one minute; authorized viewers can still save a copy.";
      linkExpiryTimer = window.setTimeout(() => {
        resultSlipLink.removeAttribute("href");
        resultSlipLink.hidden = true;
        resultSlipStatus.textContent = "The link expired. Enter the passcode again to request a new one.";
      }, 60_000);
    } catch {
      resultSlipStatus.textContent = "Unable to reach private access right now. Please try again later.";
    } finally {
      resultSlipInput.value = "";
      accessButton.disabled = false;
    }
  });
}
