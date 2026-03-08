function enableEdit() {
    document.querySelectorAll('.profile-info input').forEach(input => {
        input.disabled = false;
    });

    document.querySelector('.edit-btn').style.display = "none";
    document.querySelector('.save-btn').style.display = "inline-block";
}

function saveProfile() {
    document.querySelectorAll('.profile-info input').forEach(input => {
        input.disabled = true;
    });

    document.querySelector('.edit-btn').style.display = "inline-block";
    document.querySelector('.save-btn').style.display = "none";

    alert("Profile Updated Successfully!");
}