let ajax_form = document.querySelector(".ajax-form");
ajax_form.onsubmit = event => {
    event.preventDefault();
    if (document.querySelector(".g-recaptcha")) {
        grecaptcha.ready(() => {
            console.log(document.querySelector(".g-recaptcha").dataset.sitekey);
            grecaptcha.execute(document.querySelector(".g-recaptcha").dataset.sitekey, { action: 'submit' })
                .then(captcha_token => {
                    return process_form(ajax_form, captcha_token);
                })
                .catch(error => {
                    console.error("An error occurred during reCAPTCHA execution:", error);
                });
        });
    } else {
        process_form(ajax_form)
            .catch(error => {
                console.error("An error occurred during form processing:", error);
            });
    }
};

const process_form = async (ajax_form, captcha_token) => {
    try {
        const response = await fetch(ajax_form.action, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(new FormData(ajax_form)).toString()
        });

        const result = await response.text();

        if (result.toLowerCase().includes("success")) {
            window.location.href = "home";
        } else if (result.includes("tfa:")) {
            window.location.href = result.replace("tfa: ", "");
        } else if (result.toLowerCase().includes("autologin")) {
            window.location.href = "home";
        } else {
            document.querySelector(".msg").innerHTML = result;
        }
    } catch (error) {
        // Handle the error here
        console.error("An error occurred:", error);
    }
};
