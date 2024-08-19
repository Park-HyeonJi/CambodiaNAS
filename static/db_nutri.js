document.addEventListener('DOMContentLoaded', () => {
    toggleIngredientInputFields();
    updateTablePagination();

    // 페이지네이션 버튼 설정
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

    document.getElementById('addIngredientBtn').addEventListener('click', addIngredient);
    document.getElementById('editIngredientBtn').addEventListener('click', editIngredient);
    document.getElementById('deleteIngredientBtn').addEventListener('click', deleteIngredient);
    document.getElementById('addNutrientBtn').addEventListener('click', addNutrient);
    document.getElementById('rowsPerPageIngredient').addEventListener('change', () => {
        rowsPerPageIngredient = parseInt(document.getElementById('rowsPerPageIngredient').value, 10);
        currentPageIngredient = 1;
        showIngredientPage(currentPageIngredient);
    });
    
    document.querySelectorAll('input[name="ingredientSearchType"]').forEach((radio) => {
        radio.addEventListener('change', toggleIngredientInputFields);
    });

    // Ingredient 테이블의 행 선택 시 이벤트 리스너 추가
    document.querySelector("#ingredientTableBody").addEventListener("click", function(e) {
        const selectedRow = e.target.closest("tr");
        if (selectedRow) {
            selectedINGID = selectedRow.cells[0].innerText; // INGID
            selectedINGNAME = selectedRow.cells[1].innerText; // INGNAME
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
            selectedRow.setAttribute('data-original-ingid', originalINGID);

            // 영양소 데이터를 로드하여 오른쪽 컨테이너에 표시
            loadNutrientData(selectedINGID);
        }
    });
});

// 영양소 데이터를 로드하고 오른쪽 컨테이너에 표시하는 함수
function loadNutrientData(ingID) {
    fetch(`/get_nutrientDBN?INGID=${ingID}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            document.getElementById('energy').value = data.Energy || '';  // "Energy" 값 설정
            document.getElementById('water').value = data.Water || '';    // "Water" 값 설정
            document.getElementById('protein').value = data.Protein || ''; // "Protein" 값 설정
            document.getElementById('fat').value = data.Fat || '';        // "Fat" 값 설정
            document.getElementById('carbo').value = data.Carbo || '';    // "Carbo" 값 설정
            document.getElementById('fiber').value = data.Fiber || '';    // "Fiber" 값 설정
            document.getElementById('ca').value = data.CA || '';          // "CA" 값 설정
            document.getElementById('fe').value = data.FE || '';          // "FE" 값 설정
            document.getElementById('zn').value = data.ZN || '';          // "ZN" 값 설정
            document.getElementById('va').value = data.VA || '';          // "VA" 값 설정
            document.getElementById('vb1').value = data.VB1 || '';        // "VB1" 값 설정
            document.getElementById('vb2').value = data.VB2 || '';        // "VB2" 값 설정
            document.getElementById('vb3').value = data.VB3 || '';        // "VB3" 값 설정
            document.getElementById('vb6').value = data.VB6 || '';        // "VB6" 값 설정
            document.getElementById('fol').value = data.Fol || '';        // "Fol" 값 설정
            document.getElementById('vb12').value = data.VB12 || '';      // "VB12" 값 설정
            document.getElementById('vc').value = data.VC || '';          // "VC" 값 설정
            document.getElementById('vd').value = data.VD || '';          // "VD" 값 설정
            document.getElementById('na').value = data.NA || '';  // "NA" 값 설정
        })
        .catch(error => {
            console.error('Error loading nutrient data:', error);
        });
}

let selectedINGID = null;
let selectedINGNAME = null;

let currentPageIngredient = 1;
let rowsPerPageIngredient = 10;
let totalRowsIngredient = 0;
let IngredientData = [];

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
    const rowsPerPageIngredientSelect = document.getElementById('rowsPerPageIngredient');
    
    if (!rowsPerPageIngredientSelect) return;

    rowsPerPageIngredient = parseInt(rowsPerPageIngredientSelect.value, 10);
    currentPageIngredient = 1;

    if (IngredientData.length > 0) {
        showIngredientPage(currentPageIngredient);
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

function searchIngredient() {
    const searchType = document.querySelector('input[name="ingredientSearchType"]:checked').value;
    const searchValue = searchType === "ingredientCode" ? 
        document.getElementById("ingredientCodeInput").value : 
        document.getElementById("ingredientNameInput").value;

    console.log('Searching for:', searchValue); // 디버그용

    fetch('/search_ingredientDBN', {
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

function addIngredient() {
    var addButton = document.getElementById('addIngredientBtn');
    addButton.textContent = 'Apply';
    addButton.removeEventListener('click', addIngredient);
    addButton.addEventListener('click', applyNewIngredient);

    var tableBody = document.querySelector("#ingredientTable tbody");

    // 새로운 행 추가: 사용자가 INGID와 INGNAME_EN을 모두 입력할 수 있도록 함
    var newRow = document.createElement("tr");
    newRow.innerHTML = `
        <td class="editable" data-placeholder="Enter INGID" contenteditable="true"></td>
        <td class="editable" data-placeholder="Enter INGNAME_EN" contenteditable="true"></td>`;
    newRow.id = 'newIngredientRow';
    tableBody.appendChild(newRow);

    // 고정된 100g 값을 알림
    alert("Note: '1 person (g)' value is fixed at 100g and cannot be changed.");

    // 기본값을 배경처럼 보이게 하고, 입력 시 제거하는 코드 추가
    handleContentEditableDefaults();
}

function applyNewIngredient() {
    var newRow = document.getElementById('newIngredientRow');
    var INGID = newRow.children[0].textContent.trim();
    var INGNAME_EN = newRow.children[1].textContent.trim();

    // 중복 체크: INGID와 INGNAME_EN의 중복 여부를 확인
    var isDuplicate = IngredientData.some(item => item.INGID === INGID || item.INGNAME_EN === INGNAME_EN);
    if (isDuplicate) {
        alert("Error: Duplicate INGID or INGNAME_EN detected. Please use unique values.");
        // UI에서 중복된 행을 제거
        document.querySelector("#ingredientTable tbody").removeChild(newRow);
        resetAddIngredientButton();
        return;
    }

    // 입력값이 유효한지 체크
    if (!INGID || !INGNAME_EN) {
        alert("Please fill in both INGID and INGNAME_EN.");
        return;
    }

    fetch('/add_ingredientDBN', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ INGID: INGID, INGNAME_EN: INGNAME_EN, '1 person (g)': 100 })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            alert("Ingredient saved successfully!");
            IngredientData.push({ INGID: INGID, INGNAME_EN: INGNAME_EN, '1 person (g)': 100 });
            totalRowsIngredient = IngredientData.length;
            showIngredientPage(currentPageIngredient); // 테이블 업데이트
            newRow.children[0].setAttribute("contenteditable", "false");
            newRow.children[1].setAttribute("contenteditable", "false");
            newRow.removeAttribute('id');
        } else {
            alert("Error saving ingredient: " + data.message);
            // 오류가 발생한 경우, 행을 제거하여 UI에서 삭제
            document.querySelector("#ingredientTable tbody").removeChild(newRow);
        }
        selectedINGID = null;
        selectedINGNAME = null;
        resetAddIngredientButton();
    })
    .catch(error => {
        console.error('Error:', error);
        alert("Error saving ingredient.");
        document.querySelector("#ingredientTable tbody").removeChild(newRow);
        resetAddIngredientButton();
    });
}

function resetAddIngredientButton() {
    var addButton = document.getElementById('addIngredientBtn');
    addButton.textContent = 'Add Ingredient';
    addButton.removeEventListener('click', applyNewIngredient);
    addButton.addEventListener('click', addIngredient);
}

function addNutrient() {
    if (!selectedINGID) {
        alert("Please select an ingredient first.");
        return;
    }

    const nutrientData = {
        energy: document.getElementById('energy').value,
        water: document.getElementById('water').value,
        protein: document.getElementById('protein').value,
        fat: document.getElementById('fat').value,
        carbo: document.getElementById('carbo').value,
        fiber: document.getElementById('fiber').value,
        ca: document.getElementById('ca').value,
        fe: document.getElementById('fe').value,
        zn: document.getElementById('zn').value,
        va: document.getElementById('va').value,
        vb1: document.getElementById('vb1').value,
        vb2: document.getElementById('vb2').value,
        vb3: document.getElementById('vb3').value,
        vb6: document.getElementById('vb6').value,
        fol: document.getElementById('fol').value,
        vb12: document.getElementById('vb12').value,
        vc: document.getElementById('vc').value,
        vd: document.getElementById('vd').value,
        na: document.getElementById('na').value
    };

    fetch(`/update_nutrient/${selectedINGID}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(nutrientData),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            alert('Nutrient data updated successfully!');
            loadNutrientData(selectedINGID);  // 업데이트 후 데이터 다시 로드
        } else {
            alert('Failed to update nutrient data: ' + data.message);
        }
        selectedINGID=null;
    })
    .catch(error => {
        console.error('Error updating nutrient data:', error);
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

    // 기존 INGID 가져오기
    const originalINGID = selectedRow.getAttribute('data-original-ingid');
    console.log("Original INGID in applyEditIngredient:", originalINGID);  // 디버깅 로그 추가

    if (!originalINGID) {
        alert("Original INGID not found. Something went wrong.");
        return;
    }

    const newINGID = selectedRow.cells[0].textContent.trim();
    const INGNAME_EN = selectedRow.cells[1].textContent.trim();

    // 입력값이 유효한지 체크
    if (!newINGID || !INGNAME_EN ) {
        alert("Please fill in all fields.");
        return;
    }

    fetch('/edit_ingredientDBN', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            original_INGID: originalINGID, // 기존 INGID
            new_INGID: newINGID, // 수정된 INGID
            INGNAME_EN: INGNAME_EN
        }),
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            throw new Error("Failed to update ingredient: " + response.statusText);
        }
    })
    .then(data => {
        if (data.status === 'success') {
            alert("Ingredient updated successfully!");

            // 수정된 행의 내용을 고정
            selectedRow.cells[0].setAttribute("contenteditable", "false");
            selectedRow.cells[1].setAttribute("contenteditable", "false");

            // 선택된 행 초기화
            selectedINGID = null;

            // 테이블 업데이트
            // ingredientTable 업데이트
            IngredientData = IngredientData.map(ingredient => {
                if (ingredient.INGID === originalINGID) {
                    return {
                        ...ingredient,
                        INGID: newINGID,
                        INGNAME_EN: INGNAME_EN
                    };
                }
                return ingredient;
            });

            totalRowsIngredient = IngredientData.length;
            showIngredientPage(currentPageIngredient);

            // Disable content editing and reset button
            selectedRow.cells[0].setAttribute("contenteditable", "false");
            selectedRow.cells[1].setAttribute("contenteditable", "false");
        } else {
            alert("Error updating ingredient: " + data.message);
        }

        resetEditIngredientButton();
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
    if (!selectedINGID) {
        alert("Please select a food item to delete.");
        return;
    }

    const confirmation = confirm(`Are you sure you want to delete the ingredient item with ID: ${selectedINGID}?`);
    if (!confirmation) {
        return;
    }
    
        fetch('/delete_ingredientDBN', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ INGIDs: selectedINGID }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert("Ingredients deleted successfully!");

                // Ingredient table 업데이트
                IngredientData = IngredientData.filter(ingredient => ingredient.INGID !== selectedINGID);
                totalRowsIngredient = IngredientData.length;
                showIngredientPage(currentPageIngredient);

                selectedINGID = null;
                selectedINGNAME = null;
            } else {
                alert("Error deleting ingredients: " + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert("Error deleting ingredients.");
        });
    }
