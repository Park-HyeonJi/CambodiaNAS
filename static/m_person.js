document.addEventListener('DOMContentLoaded', () => {
    loadGroupsForUser();
});

let selectedUserId = null;

function loadGroupsForUser() {
    let groups = JSON.parse(localStorage.getItem('groups')) || [];
    const groupSelect = document.getElementById('group-select');
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
    const selectedGroup = document.getElementById('group-select').value;
    let users = JSON.parse(localStorage.getItem(selectedGroup + '_users')) || [];

    const userList = document.getElementById('user-list');
    userList.innerHTML = '';

    users.forEach(user => {
        const row = document.createElement('tr');
        row.addEventListener('click', () => selectUser(row, user));
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.name}</td>
            <td>${user.gender}</td>
            <td>${user.age}</td>
            <td>${user.height}</td>
            <td>${user.weight}</td>
        `;
        userList.appendChild(row);
    });

    document.getElementById('user-details').classList.remove('hidden');
    selectedUserId = null;
}

let selectedRow = null;

function selectUser(row, user) {
    if (selectedRow) {
        selectedRow.classList.remove('selected');
    }

    selectedRow = row;
    selectedRow.classList.add('selected');
    
    showUserDetails(user);
}

function showUserDetails(user) {
    selectedUserId = user.id;
    document.getElementById('user-id').value = user.id;
    document.getElementById('user-name').value = user.name;
    document.getElementById('user-gender').value = user.gender;
    document.getElementById('user-age').value = user.age;
    document.getElementById('user-height').value = user.height;
    document.getElementById('user-weight').value = user.weight;
    document.getElementById('user-details').classList.remove('hidden');
}

function saveUser() {
    const selectedGroup = document.getElementById('group-select').value;
    let users = JSON.parse(localStorage.getItem(selectedGroup + '_users')) || [];
    let newUser = {
        id: document.getElementById('user-id').value,
        name: document.getElementById('user-name').value,
        gender: document.getElementById('user-gender').value,
        age: parseInt(document.getElementById('user-age').value),
        height: parseInt(document.getElementById('user-height').value),
        weight: parseInt(document.getElementById('user-weight').value)
    };

    // Check if any field is empty or if age, height, weight are negative
    if (!newUser.id || !newUser.name || !newUser.gender || newUser.age <= 0 || newUser.height <= 0 || newUser.weight <= 0) {
        alert('Please enter all information and ensure age, height, and weight are positive.');
        return;
    }

    if (selectedUserId === null) {
        // Check for duplicate ID when adding a new user
        if (users.some(user => user.id === newUser.id)) {
            alert('This ID already exists.');
            return;
        }
        users.push(newUser);
    } else {
        // Check for duplicate ID when editing a user, excluding the current user being edited
        if (newUser.id !== selectedUserId && users.some(user => user.id === newUser.id)) {
            alert('This ID already exists.');
            return;
        }
        users = users.map(user => user.id === selectedUserId ? newUser : user);
    }

    localStorage.setItem(selectedGroup + '_users', JSON.stringify(users));
    loadUsers();
    clearUserDetails();
}

function addUser() {
    selectedUserId = null;
    clearUserDetails();
    document.getElementById('user-details').classList.remove('hidden');
}

function deleteUser() {
    const selectedGroup = document.getElementById('group-select').value;
    if (selectedUserId) {
        let users = JSON.parse(localStorage.getItem(selectedGroup + '_users')) || [];
        users = users.filter(user => user.id !== selectedUserId);
        localStorage.setItem(selectedGroup + '_users', JSON.stringify(users));
        loadUsers();
        clearUserDetails();
    } else {
        alert('Select the user you want to delete.');
    }
}

function clearUserDetails() {
    selectedRow = null;
    document.querySelectorAll('tr.selected').forEach(row => row.classList.remove('selected'));
    document.getElementById('user-id').value = '';
    document.getElementById('user-name').value = '';
    document.getElementById('user-gender').value = 'male';
    document.getElementById('user-age').value = '';
    document.getElementById('user-height').value = '';
    document.getElementById('user-weight').value = '';
    document.getElementById('user-details').classList.remove('hidden'); 
    selectedUserId = null;
}

function searchUser() {
    const searchValue = document.getElementById('search-id').value.trim().toLowerCase();
    const rows = document.getElementById('user-list').getElementsByTagName('tr');

    Array.from(rows).forEach(row => {
        const id = row.getElementsByTagName('td')[0].textContent.toLowerCase();
        if (id.includes(searchValue)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}
