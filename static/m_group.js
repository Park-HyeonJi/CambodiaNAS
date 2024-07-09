document.addEventListener('DOMContentLoaded', () => {
    loadGroups();
});

let selectedGroup = null;

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
}

let selectedRow = null;
let selectedGroupName = null;

function selectGroup(row, groupName) {
    if (selectedRow) {
        selectedRow.classList.remove('selected');
    }

    selectedRow = row;
    selectedRow.classList.add('selected');
    
    showGroupDetails(groupName);
}

function showGroupDetails(groupName) {
    selectedGroupName = groupName;
    const groupDesc = localStorage.getItem(groupName + '_desc') || '';
    document.getElementById('group-name').value = groupName;
    document.getElementById('group-desc').value = groupDesc;
}

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


function clearGroupDetails() {
    selectedGroup = null;
    document.getElementById('group-name').value = '';
    document.getElementById('group-desc').value = '';
}
