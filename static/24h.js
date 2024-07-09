document.addEventListener('DOMContentLoaded', () => {
    loadGroupsForUser();
    toggleInputFields();
});

function loadGroupsForUser() {
    let groups = JSON.parse(localStorage.getItem('groups')) || [];
    const groupSelect = document.getElementById('userGroup');
    groupSelect.innerHTML = '';

    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        option.textContent = group;
        groupSelect.appendChild(option);
    });

    loadUsers(); // Load users for the first group by default
}

function loadUsers() {
    const selectedGroup = document.getElementById('userGroup').value;
    let users = JSON.parse(localStorage.getItem(selectedGroup + '_users')) || [];

    const userSelect = document.getElementById('userID');
    userSelect.innerHTML = '';

    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.name;
        userSelect.appendChild(option);
    });

    selectedUserId = null;
}

function toggleInputFields() {
    var codeInput = document.getElementById("codeInput");
    var nameInput = document.getElementById("nameInput");
    var searchType = document.querySelector('input[name="searchType"]:checked').value;

    if (searchType === "code") {
        codeInput.disabled = false;
        nameInput.disabled = true;
    } else {
        codeInput.disabled = true;
        nameInput.disabled = false;
    }
}

function searchFood() {
    var searchType = document.querySelector('input[name="searchType"]:checked').value;
    var searchValue = (searchType === "code") ? document.getElementById("codeInput").value : document.getElementById("nameInput").value;

    fetch('/search_food', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ searchType: searchType, searchValue: searchValue })
    })
    .then(response => response.json())
    .then(data => {
        var tableBody = document.querySelector("#foodTable tbody");
        tableBody.innerHTML = "";
        data.forEach(row => {
            var tr = document.createElement("tr");
            tr.innerHTML = `<td>${row['Food Code']}</td><td>${row['Food Name']}</td>`;
            tableBody.appendChild(tr);
        });
    });
}

function loadData() {
    // Load data functionality
}

function copyData() {
    // Copy data functionality
}
