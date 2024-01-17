// Extract Domain from the Url
function extractDomainNameFromUrl(url) {
  try {
    const urlObject = new URL(url);
    let domainName = urlObject.hostname;
    const parts = domainName.split(".");
    const wwwIndex = parts.findIndex((part) => part.toLowerCase() === "www");
    if (wwwIndex !== -1 && wwwIndex + 1 < parts.length) {
      domainName = parts.slice(wwwIndex + 1).join(".");
    }
    return domainName;
  } catch (error) {
    console.error("Invalid URL:", error.message);
    return null;
  }
}

async function scrapeEmailAddresses(domainName) {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    const currentUrl = currentTab.url;

    const response = await fetch(currentUrl);
    const htmlContent = await response.text();
    const emailRegex = /[\w\.=-]+@[\w\.-]+\.[\w]{2,3}/gim;
    let emails = htmlContent.match(emailRegex) || [];
    if (emails.length === 0) {
      displayNoEmailsFound();
      return;
    }

    let uniqueEmails = new Set(emails);

    if (domainName) {
      const filteredEmails = emails.filter(
        (email) => email.endsWith(`@${domainName}`) || email.endsWith("gmail.com")
      );
      uniqueEmails = new Set(filteredEmails);
    }

    const emailListElement = document.getElementById("emailList");
    emailListElement.innerHTML = "";

    if (uniqueEmails.size > 0) {
      createAndAppendEmailListItems([...uniqueEmails]);
    } else {
      displayNoEmailsFound();
    }
  } catch (error) {
    console.error("Error fetching page content:", error);
    chrome.runtime.sendMessage({ emails: [] });
  }
}

function displayNoEmailsFound() {
  const emailListElement = document.getElementById("emailList");
  emailListElement.innerHTML = "";

  const listItem = document.createElement("li");
  listItem.textContent = "No email addresses found on this page.";
  emailListElement.appendChild(listItem);
}

async function createAndAppendEmailListItems(emails) {
  for (const email of emails) {
    const listItem = document.createElement("li");
    listItem.textContent = email;
    listItem.classList.add("email-list-item");

    const addButton = createAddButton(email);
    listItem.appendChild(addButton);

    try {
      const domainEmailExists = await checkEmailExistence(email);
      if (domainEmailExists) {
        addButton.style.display = "none";
        addButton.disabled = true;
      }
      // if (!addButton.disabled) {
      //   saveEmailToDatabase(email);
      // }
    } catch (error) {
      console.error("Error checking email existence:", error);
    }

    const emailListElement = document.getElementById("emailList");
    emailListElement.appendChild(listItem);
  }
}

function createAddButton(email) {
  const addButton = document.createElement("button");
  addButton.textContent = "Add to List";

  addButton.addEventListener("click", async () => {
    try {
      const domainEmailExists = await checkEmailExistence(email);
      if (domainEmailExists) {
        addButton.style.display = "none";
        addButton.disabled = true;
      }
      if (!addButton.disabled) {
        saveEmailToDatabase(email);
      }
    } catch (error) {
      console.error("Error checking email existence:", error);
    }
  });

  return addButton;
}

// Modified checkEmailExistence function
async function checkEmailExistence(email) {
  const apiUrl = "https://lead.srninfotech.com/api/check-emails";

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();
  console.log(data, "dataf")
  return data.exists;
}

// Save Data tyo database
async function saveEmailToDatabase(email) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0];
    const currentUrl = currentTab.url;
    const domainName = extractDomainNameFromUrl(currentUrl);
    const dropdown = document.getElementById("categoryDropdown");

    const selectedOption = dropdown.options[dropdown.selectedIndex];
    const category = selectedOption.textContent;
    localStorage.setItem("category", category);

    if (domainName !== "linkedin.com") {
      fetch("https://lead.srninfotech.com/api/save-emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          DomainName: domainName,
          Email: email,
          category: category,
        }),
      })
        .then((response) => {
          if (response.ok) {
            console.log("Email saved successfully to the database!");
            // Disable the button after successful save
            addButton.disabled = true;
          } else {
            console.error("Failed to save email to the database.");
          }
        })
        .catch((error) => {
          console.error("Error saving email:", error);
        });
    } else {
      fetch("https://lead.srninfotech.com/api/save-linkedin-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ Email: email, category: category }),
      })
        .then((response) => {
          if (response.ok) {
            console.log("LinkedIn data saved successfully to the database!");
            // Disable the button after successful save
            addButton.disabled = true;
          } else {
            console.error("Failed to save LinkedIn data to the database.");
          }
        })
        .catch((error) => {
          console.error("Error saving LinkedIn data:", error);
        });
    }
  });
}


function logCurrentTabDomainAndScrapeEmails() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0];
    const currentUrl = currentTab.url;
    const domainName = extractDomainNameFromUrl(currentUrl);
    if (domainName) {
      console.log("Current Tab Domain Name:", domainName);

      document.getElementById("currentTabDomain").textContent = domainName;

      scrapeEmailAddresses(domainName);
    }
  });
}

// Call the function
document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("extensionButton")
    .addEventListener("click", logCurrentTabDomainAndScrapeEmails);
  setTimeout(logCurrentTabDomainAndScrapeEmails, 100);
});

document.addEventListener("DOMContentLoaded", () => {
  const dropdown = document.getElementById("categoryDropdown");
  function fetchCategories() {
    fetch("https://lead.srninfotech.com/api/categories")
      .then((response) => response.json())
      .then((categories) => {
        const previouslySelectedCategory = localStorage.getItem("category");
        categories.forEach((category) => {
          const optionElement = document.createElement("option");
          optionElement.value = category._id;
          optionElement.innerText = category.category;

          if (category.category === previouslySelectedCategory) {
            optionElement.setAttribute("selected", "selected");
          }
          dropdown.appendChild(optionElement);
        });
      })
      .catch((error) => console.error("Error fetching categories:", error));
  }
  function addCategory() {
    const newCategoryName = prompt("Enter the name of the new category:");
    if (newCategoryName) {
      const newCategory = { category: newCategoryName };

      fetch("https://lead.srninfotech.com/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newCategory),
      })
        .then((response) => {
          if (response.ok) {
            alert("New category added successfully!");
            dropdown.innerHTML = "";
            fetchCategories();
          } else {
            alert("Failed to add the new category. Please try again.");
          }
        })
        .catch((error) => {
          console.error("Error adding category:", error);
          alert(
            "An error occurred while adding the category. Please try again."
          );
        });
    }
  }

  fetchCategories();
});

document.addEventListener("DOMContentLoaded", () => {
  const dropdown = document.getElementById("categoryDropdown");
  const previouslySelectedCategory = localStorage.getItem("selectedCategory");
  if (previouslySelectedCategory) {
    dropdown.value = previouslySelectedCategory;
  }
});

