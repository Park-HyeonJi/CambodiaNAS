document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('file-upload').addEventListener('change', handleFileUpload);
    loadGroups();
    clearGroupDetails();
});

let selectedGroup = null;

// Load groups from localStorage and populate the group list
function loadGroups() {
    let groups = JSON.parse(localStorage.getItem('groups')) || [];
    const groupList = document.getElementById('group-list');
    groupList.innerHTML = '';

    groups.forEach(group => {
        const row = document.createElement('tr');
        row.addEventListener('click', () => selectGroup(row, group.name));
        const cell = document.createElement('td');
        cell.textContent = group.name;
        row.appendChild(cell);
        groupList.appendChild(row);
    });

    clearGroupDetails(); // Hide group details form after loading groups
}

let selectedRow = null;
let selectedGroupName = null;

// Select a group and show its details
function selectGroup(row, groupName) {
    if (selectedRow) {
        selectedRow.classList.remove('selected');
    }

    selectedRow = row;
    selectedRow.classList.add('selected');
    
    showGroupDetails(groupName);
}

// Populate the group details form with the selected group's data
function showGroupDetails(groupName) {
    let groups = JSON.parse(localStorage.getItem('groups')) || [];
    let group = groups.find(g => g.name === groupName);

    selectedGroupName = groupName;
    document.getElementById('group-name').value = group.name;
    document.getElementById('group-desc').value = group.description;
    document.getElementById('group-details').classList.remove('hidden'); // Show group details form
}

// Save the group details to localStorage
function saveGroup() {
    if (!selectedGroupName) {
        alert('Select the group you want to save');
        return;
    }

    let newGroupName = document.getElementById('group-name').value;
    let groupDesc = document.getElementById('group-desc').value;

    let groups = JSON.parse(localStorage.getItem('groups')) || [];
    let group = groups.find(g => g.name === selectedGroupName);

    if (newGroupName !== selectedGroupName && groups.some(g => g.name === newGroupName)) {
        alert('This group name already exists.');
        return;
    }

    group.name = newGroupName;
    group.description = groupDesc;
    localStorage.setItem('groups', JSON.stringify(groups));

    selectedGroupName = newGroupName; 
    loadGroups();
}

// Add a new group
function addGroup() {
    let groupName = prompt("Enter the group name to add:");
    if (groupName) {
        let groups = JSON.parse(localStorage.getItem('groups')) || [];
        if (!groups.some(g => g.name === groupName)) {
            groups.push({ name: groupName, description: '' });
            localStorage.setItem('groups', JSON.stringify(groups));
            loadGroups();
        } else {
            alert('This group name already exists.');
        }
    }
}

// Delete the selected group from localStorage
function deleteGroup() {
    if (selectedGroupName) { 
        let groups = JSON.parse(localStorage.getItem('groups')) || [];
        groups = groups.filter(g => g.name !== selectedGroupName); 
        localStorage.setItem('groups', JSON.stringify(groups));
        loadGroups();
        clearGroupDetails();
    } else {
        alert('Select the group you want to delete.');
    }
}

// Clear the group details form and hide it
function clearGroupDetails() {
    selectedGroup = null;
    document.getElementById('group-name').value = '';
    document.getElementById('group-desc').value = '';
    document.getElementById('group-details').classList.add('hidden'); // Hide group details form
}

// Handle file upload
function handleFileUpload(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const groupsSheet = workbook.Sheets['Groups'];
        const usersSheet = workbook.Sheets['Users'];
        
        const groups = XLSX.utils.sheet_to_json(groupsSheet);
        const users = XLSX.utils.sheet_to_json(usersSheet);

        localStorage.setItem('groups', JSON.stringify(groups));
        groups.forEach(group => {
            localStorage.setItem(group.name + '_users', JSON.stringify(users.filter(user => user.groupId === group.id)));
        });

        loadGroups();
    };

    reader.readAsArrayBuffer(file);
}

function downloadExcel() {
    const groups = JSON.parse(localStorage.getItem('groups')) || [];
    const groupData = groups.map(group => ({ id: group.id, name: group.name, description: group.description }));

    let userData = [];
    groups.forEach(group => {
        const users = JSON.parse(localStorage.getItem(group.name + '_users')) || [];
        userData = userData.concat(users.map(user => ({
            id: user.id, 
            name: user.name, 
            gender: user.gender, 
            age: user.age, 
            height: user.height, 
            weight: user.weight, 
            groupId: group.name
        })));
    });

    const workbook = XLSX.utils.book_new();
    const groupSheet = XLSX.utils.json_to_sheet(groupData);
    const userSheet = XLSX.utils.json_to_sheet(userData);

    XLSX.utils.book_append_sheet(workbook, groupSheet, 'Groups');
    XLSX.utils.book_append_sheet(workbook, userSheet, 'Users');

    XLSX.writeFile(workbook, 'group_user_management.xlsx');
}
