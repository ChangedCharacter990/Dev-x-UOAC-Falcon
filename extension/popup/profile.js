(() => {
  const PROFILE_ID = "google-profile";

  function showProfile({ email, picture }) {
    if (!email || document.getElementById(PROFILE_ID)) return;

    const host = document.querySelector(".arcade-card") ?? document.querySelector("#root > div");
    if (!host) return;

    const section = document.createElement("section");
    section.id = PROFILE_ID;
    section.className = "profile";
    section.setAttribute("aria-label", "Signed-in account");

    if (picture) {
      const image = document.createElement("img");
      image.className = "profile-picture";
      image.src = picture;
      image.alt = "Google profile";
      image.referrerPolicy = "no-referrer";
      section.append(image);
    } else {
      const fallback = document.createElement("span");
      fallback.className = "profile-placeholder";
      fallback.setAttribute("aria-hidden", "true");
      fallback.textContent = email.charAt(0).toUpperCase();
      section.append(fallback);
    }

    const address = document.createElement("span");
    address.className = "profile-email";
    address.title = email;
    address.textContent = email;
    section.append(address);
    host.prepend(section);
  }

  function loadProfile() {
    chrome.identity.getProfileUserInfo((user) => {
      if (!user.email) return;
      showProfile({ email: user.email });

      chrome.identity.getAuthToken({ interactive: false }, async (result) => {
        const token = typeof result === "string" ? result : result?.token;
        if (!token) return;

        try {
          const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          if (!response.ok || !data.picture) return;
          document.getElementById(PROFILE_ID)?.remove();
          showProfile({ email: data.email || user.email, picture: data.picture });
        } catch {
          // The email and initials fallback stay visible if Google profile data is unavailable.
        }
      });
    });
  }

  const observer = new MutationObserver(() => {
    if (document.querySelector("#root > div")) {
      observer.disconnect();
      loadProfile();
    }
  });
  observer.observe(document.getElementById("root"), { childList: true, subtree: true });
  loadProfile();
})();
