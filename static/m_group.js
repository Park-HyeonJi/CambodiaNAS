document.addEventListener('DOMContentLoaded', () => {
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
        row.addEventListener('click', () => selectGroup(row, group));
        const cell = document.createElement('td');
        cell.textContent = group;
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
    selectedGroupName = groupName;
    const groupDesc = localStorage.getItem(groupName + '_desc') || '';
    document.getElementById('group-name').value = groupName;
    document.getElementById('group-desc').value = groupDesc;
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
    if (newGroupName !== selectedGroupName && groups.includes(newGroupName)) {
        alert('This group name already exists.');
        return;
    }

    groups = groups.map(group => group === selectedGroupName ? newGroupName : group);
    localStorage.setItem('groups', JSON.stringify(groups));

    localStorage.removeItem(selectedGroupName + '_desc');
    localStorage.setItem(newGroupName + '_desc', groupDesc);

    selectedGroupName = newGroupName; 
    loadGroups();
}

// Add a new group
function addGroup() {
    let groupName = prompt("Enter the group name to add:");
    if (groupName) {
        let groups = JSON.parse(localStorage.getItem('groups')) || [];
        if (!groups.includes(groupName)) {
            groups.push(groupName);
            localStorage.setItem('groups', JSON.stringify(groups));
            localStorage.setItem(groupName + '_desc', '');
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
        groups = groups.filter(group => group !== selectedGroupName); 
        localStorage.removeItem(selectedGroupName + '_desc');
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
    document.getElementById('group-details').classList.remove('hidden'); // Hide group details form
}
