let selectedFoodID = null;
let selectedFoodName = null;

document.addEventListener('DOMContentLoaded', () => {
    toggleInputFields();
    toggleIngredientInputFields();
    updateTablePagination();

    // Ensure the pagination buttons are correctly set up for Food
    document.getElementById('prevPageFoodBtn').addEventListener('click', () => {
        if (currentPageFood > 1) {
            currentPageFood--;
            showPage(currentPageFood);
        }
    });
    
    document.getElementById('nextPageFoodBtn').addEventListener('click', () => {
        if (currentPageFood < Math.ceil(totalRowsFood / rowsPerPageFood)) {
            currentPageFood++;
            showPage(currentPageFood);
        }
    });

    // Ensure the pagination buttons are correctly set up for Ingredients
    document.getElementById('prevPageIngredientBtn').addEventListener('click', () => {
        if (currentPageIngredient > 1) {
            currentPageIngredient--;
            showIngredientPage(currentPageIngredient);
        }
    });
    
    document.getElementById('nextPageIngredientBtn').addEventListener('click', () => {
        if (currentPageIngredient < Math.ceil(totalRowsIngredient / rowsPerPageIngredient)) {
            currentPageIngredient++;
            showIngredientPage(currentPageIngredient);
        }
    });

    document.getElementById('addFoodBtn').addEventListener('click', addFood);
    document.getElementById('editFoodBtn').addEventListener('click', editFood);
    document.getElementById('deleteFoodBtn').addEventListener('click', deleteFood);
    document.getElementById('addIngredientBtn').addEventListener('click', addIngredient);
    document.getElementById('editIngredientBtn').addEventListener('click', editIngredient);
    document.getElementById('deleteIngredientBtn').addEventListener('click', deleteIngredient);

    document.getElementById('rowsPerPageFood').addEventListener('change', () => {
        rowsPerPageFood = parseInt(document.getElementById('rowsPerPageFood').value, 10);
        currentPageFood = 1;
        showPage(currentPageFood);
    });

    document.getElementById('rowsPerPageIngredient').addEventListener('change', () => {
        rowsPerPageIngredient = parseInt(document.getElementById('rowsPerPageIngredient').value, 10);
        currentPageIngredient = 1;
        showIngredientPage(currentPageIngredient);
    });

    // 테이블 행 선택 시 이벤트 리스너
    document.querySelector("#foodTable").addEventListener("click", function(e) {
        const selectedRow = e.target.closest("tr");
        if (selectedRow) {
            selectedFoodID = selectedRow.cells[0].innerText; // FOODID
            selectedFoodName = selectedRow.cells[1].innerText; // FOODNAME

            // 이전 선택된 행의 배경색 초기화
            document.querySelectorAll("#foodTable tr").forEach(row => {
                row.classList.remove("selectedRow");
                row.style.backgroundColor = '';
            });

            // 현재 선택된 행 표시
            selectedRow.classList.add("selectedRow");
            selectedRow.style.backgroundColor = "lightgray";
        }
    });

    const foodTableBody = document.getElementById('foodTableBody');
    if (foodTableBody) {
        foodTableBody.addEventListener('click', handleRowClick);
    }

    document.querySelectorAll('input[name="searchType"]').forEach((radio) => {
        radio.addEventListener('change', toggleInputFields);
    });
    
    document.querySelectorAll('input[name="ingredientSearchType"]').forEach((radio) => {
        radio.addEventListener('change', toggleIngredientInputFields);
    });

    // Ingredient 테이블의 행 선택 시 이벤트 리스너 추가
    document.querySelector("#ingredientTableBody").addEventListener("click", function(e) {
        const selectedRow = e.target.closest("tr");
        if (selectedRow) {
            // 기존 선택된 행의 배경색 초기화
            document.querySelectorAll("#ingredientTableBody tr").forEach(row => {
                row.classList.remove("selectedRow");
                row.style.backgroundColor = '';
            });
    
            // 현재 선택된 행 표시
            selectedRow.classList.add("selectedRow");
            selectedRow.style.backgroundColor = "lightgray";
    
            // 기존 INGID를 data 속성으로 저장
            const originalINGID = selectedRow.getAttribute('data-original-ingid') || selectedRow.cells[0].textContent.trim();
            console.log("Setting originalINGID:", originalINGID);  // 디버깅 로그 추가
            selectedRow.setAttribute('data-original-ingid', originalINGID);
        }
    });
    
});

let currentPageFood = 1;
let rowsPerPageFood = 10;
let totalRowsFood = 0;
let foodData = [];

let currentPageIngredient = 1;
let rowsPerPageIngredient = 10;
let totalRowsIngredient = 0;
let IngredientData = [];

function toggleInputFields() {
    const codeInput = document.getElementById("codeInput");
    const nameInput = document.getElementById("nameInput");
    const searchType = document.querySelector('input[name="searchType"]:checked').value;

    codeInput.disabled = searchType !== "code";
    nameInput.disabled = searchType === "code";

    if (searchType === "code") {
        nameInput.value = '';
    } else {
        codeInput.value = '';
    }
}

function toggleIngredientInputFields() {
    const ingredientCodeInput = document.getElementById("ingredientCodeInput");
    const ingredientNameInput = document.getElementById("ingredientNameInput");
    const ingredientSearchType = document.querySelector('input[name="ingredientSearchType"]:checked').value;

    ingredientCodeInput.disabled = ingredientSearchType !== "ingredientCode";
    ingredientNameInput.disabled = ingredientSearchType === "ingredientCode";

    if (ingredientSearchType === "ingredientCode") {
        ingredientNameInput.value = '';
    } else {
        ingredientCodeInput.value = '';
    }
}

function updateTablePagination() {
    const rowsPerPageFoodSelect = document.getElementById('rowsPerPageFood');
    const rowsPerPageIngredientSelect = document.getElementById('rowsPerPageIngredient');
    
    if (!rowsPerPageFoodSelect || !rowsPerPageIngredientSelect) return;

    rowsPerPageFood = parseInt(rowsPerPageFoodSelect.value, 10);
    rowsPerPageIngredient = parseInt(rowsPerPageIngredientSelect.value, 10);
    currentPageFood = 1;  
    currentPageIngredient = 1;

    if (foodData.length > 0) {
        showPage(currentPageFood);
    }
    if (IngredientData.length > 0) {
        showIngredientPage(currentPageIngredient);
    }
}

function showPage(page) {
    const tableBody = document.querySelector("#foodTable tbody");
    if (!tableBody) return;

    const start = (page - 1) * rowsPerPageFood;
    const end = start + rowsPerPageFood;

    tableBody.innerHTML = "";

    foodData.slice(start, end).forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${row['FOODID'] || 'N/A'}</td><td>${row['FOODNAME'] || 'N/A'}</td>`;
        tr.onclick = function() {
            tableBody.querySelectorAll('tr').forEach(r => r.style.backgroundColor = '');
            tr.style.backgroundColor = 'lightgray';
            tr.dataset.selected = true;
            loadIngredients(row['FOODID']);
        };
        tableBody.appendChild(tr);
    });

    const totalPages = Math.ceil(totalRowsFood / rowsPerPageFood);
    const prevPageBtn = document.getElementById('prevPageFoodBtn');
    const nextPageBtn = document.getElementById('nextPageFoodBtn');

    if (prevPageBtn && nextPageBtn) {
        prevPageBtn.disabled = page === 1;
        nextPageBtn.disabled = page === totalPages;
    }
}

function showIngredientPage(page) {
    const tableBody = document.getElementById('ingredientTableBody');
    if (!tableBody) return;

    const start = (page - 1) * rowsPerPageIngredient;
    const end = start + rowsPerPageIngredient;

    tableBody.innerHTML = "";

    IngredientData.slice(start, end).forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${row.INGID || 'N/A'}</td>
            <td>${row.INGNAME_EN || 'N/A'}</td>
            <td>${row['1 person (g)'] || 'N/A'}</td>
        `;
        tableBody.appendChild(tr);
    });

    const totalPages = Math.ceil(totalRowsIngredient / rowsPerPageIngredient);
    const prevPageBtn = document.getElementById('prevPageIngredientBtn');
    const nextPageBtn = document.getElementById('nextPageIngredientBtn');

    if (prevPageBtn && nextPageBtn) {
        prevPageBtn.disabled = page === 1;
        nextPageBtn.disabled = page === totalPages;
    }
}

function searchFood() {
    const searchType = document.querySelector('input[name="searchType"]:checked').value;
    const searchValue = searchType === "code" ? document.getElementById("codeInput").value : document.getElementById("nameInput").value;

    fetch('/search_foodDB', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchType, searchValue })
    })
    .then(response => response.json())
    .then(data => {
        foodData = data;
        totalRowsFood = data.length;
        showPage(currentPageFood);
    })
    .catch(error => console.error('Error fetching food data:', error));
}

function searchIngredient() {
    const searchType = document.querySelector('input[name="ingredientSearchType"]:checked').value;
    const searchValue = searchType === "ingredientCode" ? 
        document.getElementById("ingredientCodeInput").value : 
        document.getElementById("ingredientNameInput").value;

    console.log('Searching for:', searchValue); // 디버그용

    fetch('/search_ingredientDB', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchType, searchValue })
    })
    .then(response => response.json())
    .then(data => {
        IngredientData = data;
        totalRowsIngredient = data.length;
        showIngredientPage(currentPageIngredient);
    })
    .catch(error => console.error('Error fetching ingredient data:', error));
}

function loadIngredients(FOODID) {
    const ingredientTableBody = document.getElementById('ingredientTableBody');
    ingredientTableBody.innerHTML = ""; // Clear the table

    // FOODID와 FOODNAME 저장
    const selectedFood = foodData.find(food => food.FOODID === FOODID);
    if (selectedFood) {
        document.getElementById('selectedFoodID').value = selectedFood.FOODID;
        document.getElementById('selectedFoodName').value = selectedFood.FOODNAME;
    }

    fetch(`/get_food_ingredientsDB?FOODID=${FOODID}`)
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (!Array.isArray(data)) {
            throw new Error('Invalid data format');
        }

        // Check if data is empty
        if (data.length === 0) {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td colspan="3">No ingredients found</td>`;
            ingredientTableBody.appendChild(tr);
            return;
        }

        // Filter out rows where all three columns are 'N/A', but keep single-row scenarios
        const filteredData = data.length > 1
            ? data.filter(item => !(item['INGID'] === 'N/A' && item['INGNAME_EN'] === 'N/A' && item['1 person (g)'] === 'N/A'))
            : data;

        // Append each ingredient to the table
        filteredData.forEach(ingredient => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${ingredient['INGID'] || 'N/A'}</td>
                <td>${ingredient['INGNAME_EN'] || 'N/A'}</td>
                <td>${ingredient['1 person (g)'] || 'N/A'}</td>
            `;

            tr.onclick = function() {
                // Clear selection from previously selected rows
                ingredientTableBody.querySelectorAll('tr').forEach(r => {
                    r.style.backgroundColor = '';
                    delete r.dataset.selected; // Remove selected status
                });

                // Highlight the current row
                tr.style.backgroundColor = 'lightgray';
                tr.dataset.selected = true;
            };

            ingredientTableBody.appendChild(tr);
        });
    })
    .catch(error => {
        console.error('Error loading ingredients:', error);
    });
}

// 테이블에서 행을 클릭했을 때 호출될 함수
function handleRowClick(event) {
    const targetRow = event.target.closest('tr');
    if (targetRow && targetRow.cells.length > 0) {
        // 첫 번째 셀에서 FOODID를 추출 (가정: 첫 번째 셀에 FOODID가 있음)
        selectedFoodID = targetRow.cells[0].textContent.trim();
        loadIngredients(selectedFoodID); // 선택된 FOODID로 데이터를 로드
    }
}


function addFood() {
    var addButton = document.getElementById('addFoodBtn');
    addButton.textContent = 'Apply';
    addButton.removeEventListener('click', addFood);
    addButton.addEventListener('click', applyNewFood);

    var tableBody = document.querySelector("#foodTable tbody");

    // 새로운 행 추가: 사용자가 FOODID와 FOODNAME을 모두 입력할 수 있도록 함
    var newRow = document.createElement("tr");
    newRow.innerHTML = `
        <td class="editable" data-placeholder="Enter Food ID" contenteditable="true"></td>
        <td class="editable" data-placeholder="Enter Food Name" contenteditable="true"></td>`;
    newRow.id = 'newFoodRow';
    tableBody.appendChild(newRow);

    // 기본값을 배경처럼 보이게 하고, 입력 시 제거하는 코드 추가
    handleContentEditableDefaults();
}

function handleContentEditableDefaults() {
    document.querySelectorAll('#newIngredientRow .editable').forEach(field => {
        const placeholder = field.getAttribute('data-placeholder');
        // 초기 상태에서 기본값을 설정합니다.
        if (!field.textContent.trim()) {
            field.textContent = placeholder;
            field.classList.add('placeholder');
        }

        // 클릭 또는 포커스 시 기본값을 제거합니다.
        field.addEventListener('focus', () => {
            if (field.classList.contains('placeholder')) {
                field.textContent = '';
                field.classList.remove('placeholder');
            }
        });

        // 입력이 없으면 기본값을 다시 표시합니다.
        field.addEventListener('blur', () => {
            if (!field.textContent.trim()) {
                field.textContent = placeholder;
                field.classList.add('placeholder');
            }
        });
    });
}

function applyNewFood() {
    var newRow = document.getElementById('newFoodRow');
    var foodID = newRow.children[0].textContent.trim();
    var foodName = newRow.children[1].textContent.trim();

    // 입력값이 유효한지 체크
    if (!foodID || !foodName) {
        alert("Please fill in both Food ID and Food Name.");
        return;
    }

    fetch('/add_foodDB', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ FOODID: foodID, FOODNAME: foodName })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            alert("Food saved successfully! Please add at least one ingredient for the new food item.");
            foodData.push({ FOODID: foodID, FOODNAME: foodName });
            totalRowsFood = foodData.length;
            showPage(currentPageFood); // 테이블 업데이트
            newRow.children[0].setAttribute("contenteditable", "false");
            newRow.children[1].setAttribute("contenteditable", "false");
            newRow.removeAttribute('id');

             // 새로운 음식을 추가한 후, 해당 음식 자동 검색
             document.getElementById('codeInput').value = foodID;
             document.querySelector('input[name="searchType"][value="code"]').checked = true;
             searchFood();  // 검색 함수 호출

        } else {
            alert("Error saving food: " + data.message);
            document.querySelector("#foodTable tbody").removeChild(newRow);
        }
        resetAddFoodButton();
    })
    .catch(error => {
        console.error('Error:', error);
        alert("Error saving food.");
        document.querySelector("#foodTable tbody").removeChild(newRow);
        resetAddFoodButton();
    });
}


function resetAddFoodButton() {
    var addButton = document.getElementById('addFoodBtn');
    addButton.textContent = 'Add Food';
    addButton.removeEventListener('click', applyNewFood);
    addButton.addEventListener('click', addFood);
}

function addIngredient() {
    const tableBody = document.getElementById('ingredientTableBody');

    // 새로운 행 추가: 사용자가 INGID, INGNAME_EN, 1 person (g)을 입력할 수 있도록 함
    const newRow = document.createElement("tr");
    newRow.innerHTML = `
        <td class="editable" data-placeholder="Enter INGID" contenteditable="true"></td>
        <td class="editable" contenteditable="false"></td>
        <td class="editable" contenteditable="true"></td>`;
    newRow.id = 'newIngredientRow';

    tableBody.appendChild(newRow);

    // Add Ingredient 버튼을 Apply Ingredient 버튼으로 변경
    const addButton = document.getElementById('addIngredientBtn');
    addButton.textContent = 'Apply';
    addButton.removeEventListener('click', addIngredient);
    addButton.addEventListener('click', applyNewIngredient);

    // `INGID` 입력 시 데이터를 가져오는 이벤트 리스너 추가
    newRow.cells[0].addEventListener('blur', function() {
        const ingid = this.textContent.trim();
        const foodid = selectedFoodID; // 현재 선택된 FOODID

        if (ingid && foodid) {
            fetch(`/get_ingredient_details?FOODID=${foodid}&INGID=${ingid}`)
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success' && data.ingredient) {
                        const ingredient = data.ingredient;
                        newRow.cells[1].textContent = ingredient.INGNAME_EN || 'N/A';  // INGNAME_EN
                        newRow.cells[2].textContent = ingredient['1 person (g)'] || '';  // 1 person (g)
                    } else {
                        alert('Ingredient not found for this FOODID.');
                    }
                })
                .catch(error => {
                    console.error('Error fetching ingredient details:', error);
                    alert("Error fetching ingredient details.");
                });
        }
    });

    // 기본값을 배경처럼 보이게 하고, 입력 시 제거하는 코드 추가
    handleContentEditableDefaults();
}

function applyNewIngredient() {
    // 선택된 ingredient 데이터를 가져옴
    const selectedRow = document.querySelector("#ingredientTableBody tr.selectedRow");
    
    if (!selectedRow) {
        alert("Please select an ingredient to apply.");
        return;
    }

    const inputINGID = selectedRow.cells[0].textContent.trim();
    const inputPersonG = parseFloat(selectedRow.cells[2].textContent.trim());
    const inputINGNAME_EN = selectedRow.cells[1].textContent.trim();

    const FOODID = selectedFoodID; // 현재 선택된 FOODID
    const FOODNAME = selectedFoodName; // 현재 선택된 FOODNAME

    if (!inputINGID || isNaN(inputPersonG)) {
        alert("Please fill in INGID and amount (g).");
        return;
    }

    // 엑셀에서 해당 INGID를 기반으로 데이터를 가져옴
    fetch(`/get_ingredient_details?INGID=${inputINGID}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success' && data.ingredient) {
                const ingredient = data.ingredient;

                // 기존 영양소 데이터를 가져와 새로운 FOODID에 추가
                const newIngredient = {
                    INGID: ingredient['INGID'],
                    INGNAME_EN: inputINGNAME_EN,  // 검색된 이름 사용
                    '1 person (g)': inputPersonG,
                    FOODID: FOODID,  // 새로운 FOODID에 맞게 업데이트
                    FOODNAME: FOODNAME, // 현재 선택된 FOODNAME 추가
                    Energy: ingredient['Energy'],
                    Water: ingredient['Water'],
                    Protein: ingredient['Protein'],
                    Fat: ingredient['Fat'],
                    Carbo: ingredient['Carbo'],
                    Fiber: ingredient['Fiber'],
                    CA: ingredient['CA'],
                    FE: ingredient['FE'],
                    ZN: ingredient['ZN'],
                    VA: ingredient['VA'],
                    VB1: ingredient['VB1'],
                    VB2: ingredient['VB2'],
                    VB3: ingredient['VB3'],
                    VB6: ingredient['VB6'],
                    Fol: ingredient['Fol'],
                    VB12: ingredient['VB12'],
                    VC: ingredient['VC'],
                    VD: ingredient['VD'],
                    NA: ingredient['NA'],
                    'NA (mg)': ingredient['NA (mg)']
                };

                saveNewIngredient(newIngredient);
            } else {
                alert('Ingredient not found for the specified INGID.');
            }
        })
        .catch(error => {
            console.error('Error fetching ingredient details:', error);
            alert("Error fetching ingredient details.");
        });
}


function displayDuplicateOptions(duplicateData, newRow) {
    const container = document.getElementById('duplicateOptionsContainer');
    container.innerHTML = ''; 

    const seen = new Set();
    const filteredData = duplicateData.filter(item => {
        const key = `${item.INGID}-${item.INGNAME_EN}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    const table = document.createElement('table');
    table.classList.add('duplicate-options-table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Select</th>
                <th>INGID</th>
                <th>INGNAME_EN</th>
                <th>1 person (g)</th>
            </tr>
        </thead>
        <tbody>
            ${filteredData.map((item, index) => `
                <tr>
                    <td><input type="radio" name="duplicateOption" value="${index}"></td>
                    <td>${item.INGID}</td>
                    <td>${item.INGNAME_EN}</td>
                    <td>${item['1 person (g)']}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.appendChild(table);

    const confirmBtn = document.createElement('button');
    confirmBtn.id = 'confirmDuplicateBtn';
    confirmBtn.textContent = 'Select';
    container.appendChild(confirmBtn);

    confirmBtn.addEventListener('click', () => {
        const selectedOption = document.querySelector('input[name="duplicateOption"]:checked');
        if (selectedOption) {
            const index = selectedOption.value;
            const selectedItem = duplicateData[index];
            applySelectedDuplicate(selectedItem, newRow);
        } else {
            alert('Please select a duplicate item.');
        }
    });

    resetAddIngredientButton();
}

function applySelectedDuplicate(item, newRow) {
    newRow.cells[0].textContent = item.INGID;
    newRow.cells[1].textContent = item.INGNAME_EN;
    newRow.cells[2].textContent = item['1 person (g)'];

    newRow.cells[0].setAttribute("contenteditable", "false");
    newRow.cells[1].setAttribute("contenteditable", "false");
    newRow.cells[2].setAttribute("contenteditable", "false");
    newRow.removeAttribute('id');

    document.getElementById('duplicateOptionsContainer').innerHTML = '';
    
    saveNewIngredient({
        INGID: item.INGID,
        INGNAME_EN: item.INGNAME_EN,
        '1 person (g)': item['1 person (g)'],
        FOODID: selectedFoodID,
        FOODNAME: selectedFoodName
    });

    selectedFoodID = null;
    selectedFoodName = null;
}

function saveNewIngredient(newIngredient) {
    fetch('/add_ingredientDB', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newIngredient),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            alert('Ingredient added successfully!');
            IngredientData.push(newIngredient);
            totalRowsIngredient = IngredientData.length;
            showIngredientPage(currentPageIngredient);

            const newRow = document.getElementById('newIngredientRow');
            if (newRow) {
                newRow.remove();
            }

            resetAddIngredientButton();
        } else {
            alert('Error adding ingredient: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function resetAddIngredientButton() {
    const addButton = document.getElementById('addIngredientBtn');
    if (addButton) {
        addButton.textContent = 'Add Ingredient';
        addButton.removeEventListener('click', applyNewIngredient);
        addButton.addEventListener('click', addIngredient);
    } else {
        console.error('Add Ingredient Button not found.');
    }
}



function editFood() {
    if (!selectedFoodID) {
        alert("Please select a food item to edit.");
        return;
    }

    const tableBody = document.querySelector("#foodTable tbody");
    const selectedRow = tableBody.querySelector("tr.selectedRow");

    if (!selectedRow) {
        alert("No row selected for editing.");
        return;
    }

    // 현재 선택된 행을 편집 가능하게 만듭니다.
    selectedRow.cells[0].setAttribute("contenteditable", "true");
    selectedRow.cells[1].setAttribute("contenteditable", "true");

    // Edit 버튼을 Apply 버튼으로 변경
    const editButton = document.getElementById('editFoodBtn');
    editButton.textContent = 'Apply';
    editButton.removeEventListener('click', editFood);
    editButton.addEventListener('click', applyEditFood);
}

function applyEditFood() {
    const tableBody = document.querySelector("#foodTable tbody");
    const selectedRow = tableBody.querySelector("tr.selectedRow");

    if (!selectedRow) {
        alert("No row selected for applying changes.");
        return;
    }

    const newFoodCode = selectedRow.cells[0].textContent.trim();
    const newFoodName = selectedRow.cells[1].textContent.trim();

    // 입력값이 유효한지 체크
    if (!newFoodCode || !newFoodName) {
        alert("Please fill in both Food ID and Food Name.");
        return;
    }

    // 서버로 수정 요청을 보냅니다.
    fetch('/edit_foodDB', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            originalFoodCode: selectedFoodID,
            foodCode: newFoodCode,
            foodName: newFoodName
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            alert("Food updated successfully!");

            // 선택된 행의 내용을 새롭게 업데이트된 값으로 고정
            selectedRow.cells[0].setAttribute("contenteditable", "false");
            selectedRow.cells[1].setAttribute("contenteditable", "false");

            // 변경된 값을 foodData 배열에도 업데이트
            const foodIndex = foodData.findIndex(food => food.FOODID === selectedFoodID);
            if (foodIndex !== -1) {
                foodData[foodIndex].FOODID = newFoodCode;
                foodData[foodIndex].FOODNAME = newFoodName;
            }

            // 선택된 행 초기화
            selectedFoodID = null;
            selectedFoodName = null;
        } else {
            alert("Error updating food: " + data.message);
        }

        resetEditFoodButton();
    })
    .catch(error => {
        console.error('Error:', error);
        alert("Error updating food.");
        resetEditFoodButton();
    });
}

function resetEditFoodButton() {
    const editButton = document.getElementById('editFoodBtn');
    editButton.textContent = 'Edit Food';
    editButton.removeEventListener('click', applyEditFood);
    editButton.addEventListener('click', editFood);
}

function deleteFood() {
    if (!selectedFoodID) {
        alert("Please select a food item to delete.");
        return;
    }

    const confirmation = confirm(`Are you sure you want to delete the food item with ID: ${selectedFoodID}?`);
    if (!confirmation) {
        return;
    }

    // 서버로 삭제 요청을 보냅니다.
    fetch('/delete_foodDB', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ foodCode: selectedFoodID }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            alert("Food deleted successfully!");

            // foodData에서 삭제한 항목 제거
            foodData = foodData.filter(food => food.FOODID !== selectedFoodID);
            totalRowsFood = foodData.length;
            showPage(currentPageFood); // 테이블 업데이트

            // 선택된 행 초기화
            selectedFoodID = null;
            selectedFoodName = null;
        } else {
            alert("Error deleting food: " + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert("Error deleting food.");
    });
}

function editIngredient() {
    const tableBody = document.getElementById('ingredientTableBody');

    if (!tableBody) {
        console.error("Element with ID 'ingredientTableBody' not found.");
        return;
    }

    const selectedRow = tableBody.querySelector("tr.selectedRow");

    if (!selectedRow) {
        alert("Please select an ingredient to edit.");
        return;
    }

    // 현재 선택된 행을 편집 가능하게 만듭니다.
    selectedRow.cells[0].setAttribute("contenteditable", "true");
    selectedRow.cells[1].setAttribute("contenteditable", "true");
    selectedRow.cells[2].setAttribute("contenteditable", "true");

    // Edit Ingredient 버튼을 Apply Ingredient 버튼으로 변경
    const editButton = document.getElementById('editIngredientBtn');
    editButton.textContent = 'Apply';
    editButton.removeEventListener('click', editIngredient);
    editButton.addEventListener('click', applyEditIngredient);
}

function applyEditIngredient() {
    const tableBody = document.getElementById('ingredientTableBody');
    const selectedRow = tableBody.querySelector("tr.selectedRow");

    if (!selectedRow) {
        alert("No row selected for applying changes.");
        return;
    }

    // 기존 INGID와 FOODID 가져오기
    const originalINGID = selectedRow.getAttribute('data-original-ingid');
    const FOODID = selectedFoodID;

    if (!originalINGID || !FOODID) {
        alert("Original INGID or FOODID not found. Something went wrong.");
        return;
    }

    const newINGID = selectedRow.cells[0].textContent.trim();
    const INGNAME_EN = selectedRow.cells[1].textContent.trim();
    const person_g = parseFloat(selectedRow.cells[2].textContent.trim());

    // 입력값이 유효한지 체크
    if (!newINGID || !INGNAME_EN || isNaN(person_g)) {
        alert("Please fill in all fields with valid data.");
        return;
    }

    // 기존 데이터와 새로운 데이터를 비교하여 성분 값의 비율 계산
    fetch(`/get_food_ingredientsDB?FOODID=${FOODID}&INGID=${originalINGID}`)
        .then(response => response.json())
        .then(originalData => {
            if (!originalData || originalData.length === 0) {
                throw new Error("Original ingredient data not found.");
            }

            const originalIngredient = originalData[0];
            const originalPersonG = parseFloat(originalIngredient['1 person (g)']);
            const scaleFactor = person_g / originalPersonG;

            // 수정할 데이터를 준비
            const updatedIngredient = {
                original_INGID: originalINGID,
                new_INGID: newINGID,
                INGNAME_EN: INGNAME_EN,
                person_g: person_g,
                FOODID: FOODID,
                Energy: originalIngredient['Energy'] * scaleFactor,
                Water: originalIngredient['Water'] * scaleFactor,
                Protein: originalIngredient['Protein'] * scaleFactor,
                Fat: originalIngredient['Fat'] * scaleFactor,
                Carbo: originalIngredient['Carbo'] * scaleFactor,
                Fiber: originalIngredient['Fiber'] * scaleFactor,
                CA: originalIngredient['CA'] * scaleFactor,
                FE: originalIngredient['FE'] * scaleFactor,
                ZN: originalIngredient['ZN'] * scaleFactor,
                VA: originalIngredient['VA'] * scaleFactor,
                VB1: originalIngredient['VB1'] * scaleFactor,
                VB2: originalIngredient['VB2'] * scaleFactor,
                VB3: originalIngredient['VB3'] * scaleFactor,
                VB6: originalIngredient['VB6'] * scaleFactor,
                Fol: originalIngredient['Fol'] * scaleFactor,
                VB12: originalIngredient['VB12'] * scaleFactor,
                VC: originalIngredient['VC'] * scaleFactor,
                VD: originalIngredient['VD'] * scaleFactor,
                NA: originalIngredient['NA'] * scaleFactor,
                'NA (mg)': originalIngredient['NA (mg)'] * scaleFactor,
            };

            // 서버에 수정된 데이터를 전송
            return fetch('/edit_ingredientDB', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedIngredient)
            });
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert("Ingredient updated successfully!");

                // 수정된 행의 내용을 고정
                selectedRow.cells[0].setAttribute("contenteditable", "false");
                selectedRow.cells[1].setAttribute("contenteditable", "false");
                selectedRow.cells[2].setAttribute("contenteditable", "false");

                // 선택된 행 초기화
                selectedFoodID = null;

                // 테이블 업데이트
                IngredientData = IngredientData.map(ingredient => {
                    if (ingredient.INGID === originalINGID && ingredient.FOODID === FOODID) {
                        return {
                            ...ingredient,
                            INGID: newINGID,
                            INGNAME_EN: INGNAME_EN,
                            '1 person (g)': person_g
                        };
                    }
                    return ingredient;
                });

                totalRowsIngredient = IngredientData.length;
                showIngredientPage(currentPageIngredient);

                resetEditIngredientButton();
            } else {
                alert("Error updating ingredient: " + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert("Error updating ingredient.");
            resetEditIngredientButton();
        });
}


function resetEditIngredientButton() {
    const editButton = document.getElementById('editIngredientBtn');
    editButton.textContent = 'Edit Ingredient';
    editButton.removeEventListener('click', applyEditIngredient);
    editButton.addEventListener('click', editIngredient);
}

function deleteIngredient() {
    const selectedIngredientRows = document.querySelectorAll("#ingredientTableBody .selectedRow");
    if (selectedIngredientRows.length === 0) {
        alert("No ingredient selected to delete.");
        return;
    }

    const foodID = selectedFoodID;
    const ingIDsToDelete = Array.from(selectedIngredientRows).map(row => row.cells[0].textContent.trim());

    if (foodID) {
        // FOODID가 있는 경우
        fetch('/delete_ingredientDB', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                FOODID: foodID,
                INGIDs: ingIDsToDelete
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert("Ingredients deleted successfully!");

                // Ingredient table 업데이트
                IngredientData = IngredientData.filter(ingredient => !ingIDsToDelete.includes(ingredient.INGID));
                totalRowsIngredient = IngredientData.length;
                showIngredientPage(currentPageIngredient);

                // FOODID와 INGID가 동일한 경우는 foodData도 업데이트
                if (ingIDsToDelete.includes(foodID)) {
                    foodData = foodData.filter(food => food.FOODID !== foodID);
                    totalRowsFood = foodData.length;
                    showPage(currentPageFood); // foodTable 업데이트
                }
            } else {
                alert("Error deleting ingredients: " + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert("Error deleting ingredients.");
        });
    } else {
        // FOODID가 없는 경우
        fetch('/delete_ingredientDB', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                INGIDs: ingIDsToDelete
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert("Ingredients deleted successfully!");

                // Ingredient table 업데이트
                IngredientData = IngredientData.filter(ingredient => !ingIDsToDelete.includes(ingredient.INGID));
                totalRowsIngredient = IngredientData.length;
                showIngredientPage(currentPageIngredient);
            } else {
                alert("Error deleting ingredients: " + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert("Error deleting ingredients.");
        });
    }
}
