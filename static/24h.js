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

        var uniqueFoods = [];
        data.forEach(row => {
            if (!uniqueFoods.some(food => food['Food Name'] === row['Food Name'])) {
                uniqueFoods.push(row);
                var tr = document.createElement("tr");
                tr.innerHTML = `<td>${row['Food Code']}</td><td>${row['Food Name']}</td>`;
                tr.onclick = function() {
                    tableBody.querySelectorAll('tr').forEach(r => r.style.backgroundColor = '');
                    tr.style.backgroundColor = 'lightgray';
                    tr.dataset.selected = true;
                };
                tableBody.appendChild(tr);
            }
        });
    });
}

// time-categroeis 버튼 클릭 시 호출
function setActive(button) {
    document.querySelectorAll('.time-categories button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    resetNutritionTable(); // 영양 성분 테이블 초기화
    loadFoodList(); // 음식 리스트 초기화
}

// 영양성분 테이블 초기화
function resetNutritionTable() {
    var mealTbody = document.getElementById('nutrition-tbody');
    var currentMealSummary = document.getElementById('current-meal-summary');
    var dailyTotalSummary = document.getElementById('daily-total-summary');

    // "Current Meal"과 "Daily Total" 행을 제외한 모든 행을 제거
    while (mealTbody.firstChild && mealTbody.firstChild !== currentMealSummary && mealTbody.firstChild !== dailyTotalSummary) {
        mealTbody.removeChild(mealTbody.firstChild);
    }
}

function addToFoodList() {
    var selectedRow = document.querySelector("#foodTable tbody tr[data-selected='true']");
    if (!selectedRow) return alert("Please select a food item to add");

    var foodCode = selectedRow.cells[0].textContent;
    var foodName = selectedRow.cells[1].textContent;
    var timeCategory = document.querySelector('.time-categories button.active').dataset.category;
    var userGroup = document.getElementById('userGroup').value;
    var userID = document.getElementById('userID').value;
    var viewDate = document.getElementById('date').value;

    fetch('/add_food', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            foodCode: foodCode,
            foodName: foodName,
            timeCategory: timeCategory,
            userGroup: userGroup,
            userID: userID,
            viewDate: viewDate
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            loadFoodList();
        } else {
            alert("Error adding food: " + data.message);
        }
    });
}

// 두 번째 컨테이너
function loadFoodList() {
    var userGroup = document.getElementById('userGroup').value;
    var userID = document.getElementById('userID').value;
    var viewDate = document.getElementById('date').value;
    var activeCategory = document.querySelector('.time-categories button.active').dataset.category;

    // 영양 성분 합산할 배열 초기화
    window.currentMealNutrition = [];

    fetch(`/get_food_list?userGroup=${userGroup}&userID=${userID}&viewDate=${viewDate}`)
    .then(response => response.json())
    .then(data => {
        document.querySelectorAll('.food-items tbody').forEach(tbody => tbody.innerHTML = ""); // 기존 데이터를 초기화

        var tableBody = document.querySelector(`.food-items tbody[data-category='${activeCategory}']`);
        var uniqueFoods = [];

        data[activeCategory].forEach(food => {
            if (!uniqueFoods.some(item => item['Food Name'] === food['Food Name'])) {
                uniqueFoods.push(food);
                var tr = document.createElement("tr");
                tr.innerHTML = `<td>${food['Food Code']}</td><td>${food['Food Name']}</td>`;
                
                // 음식 영양성분 계산 함수 호출
                loadNutrition(food['Food Code'], food['Food Name']);

                tr.onclick = function() {
                    tableBody.querySelectorAll('tr').forEach(r => r.style.backgroundColor = '');
                    tr.style.backgroundColor = 'lightgray';
                    // console.log('Loading nutrition for Food Code:', food['Food Code']);
        
                    // 행을 클릭할 때 재료 로드
                    loadIngredients(food);
                };
                tableBody.appendChild(tr);
            }
        });

        // 모든 카테고리의 영양성분을 합산하여 "Daily Total" 업데이트
        calculateDailyTotal(data)
    });
}

// 영양 성분 테이블 - Current Food
function loadNutrition(foodCode, foodName) {
    fetch('/get_ingredients', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ foodCode: foodCode })
    })
    .then(response => response.json())
    .then(ingredientCodes => {
        // console.log('현재 음식 ingredient codes:', ingredientCodes);
        fetch('/get_nutrition', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ingredientCodes: ingredientCodes })
        })
        .then(response => response.json())
        .then(data => {
            // console.log('Received nutrition data:', data);
            if (data.length > 0) {
                var nutrientTotals = {
                    'ENERC (kcal)': 0, 'WATER (g)': 0, 'PROTCNT (g)': 0, 'FAT (g)': 0, 
                    'CHOAVLDF (g)': 0, 'FIBTG (g)': 0, 'CA (mg)': 0, 'FE (mg)': 0, 
                    'ZN (mg)': 0, 'VITA_RAE (mcg)': 0, 'VITD (mcg)': 0, 'THIA (mg)': 0, 'RIBF (mg)': 0, 
                    'NIA (mg)': 0, 'PANTAC (mg)': 0, 'VITB6 (mg)': 0, 'FOL (mcg)': 0
                };

                data.forEach(nutrient => {
                    for (var key in nutrientTotals) {
                        if (nutrient.hasOwnProperty(key)) {
                            nutrientTotals[key] += parseFloat(nutrient[key]) || 0;
                        }
                    }
                });

                // console.log('현재 음식 총 영양성분:', nutrientTotals);

                // 셀 추가
                var mealTbody = document.getElementById('nutrition-tbody');
                
                // "Current Meal"과 "Daily Total" 행을 유지하고 새로운 행을 추가
                var currentMealSummary = document.getElementById('current-meal-summary');
                var dailyTotalSummary = document.getElementById('daily-total-summary');

                if(mealTbody){
                    var tr = document.createElement('tr');

                    tr.innerHTML = `
                        <td>${foodName}</td>
                        <td>${nutrientTotals['ENERC (kcal)'].toFixed(2)}</td>
                        <td>${nutrientTotals['WATER (g)'].toFixed(2)}</td>
                        <td>${nutrientTotals['PROTCNT (g)'].toFixed(2)}</td>
                        <td>${nutrientTotals['FAT (g)'].toFixed(2)}</td>
                        <td>${nutrientTotals['CHOAVLDF (g)'].toFixed(2)}</td>
                        <td>${nutrientTotals['FIBTG (g)'].toFixed(2)}</td>
                        <td>${nutrientTotals['CA (mg)'].toFixed(2)}</td>
                        <td>${nutrientTotals['FE (mg)'].toFixed(2)}</td>
                        <td>${nutrientTotals['ZN (mg)'].toFixed(2)}</td>
                        <td>${nutrientTotals['VITA_RAE (mcg)'].toFixed(2)}</td>
                        <td>${nutrientTotals['VITD (mcg)'].toFixed(2)}</td>
                        <td>${nutrientTotals['THIA (mg)'].toFixed(2)}</td>
                        <td>${nutrientTotals['RIBF (mg)'].toFixed(2)}</td>
                        <td>${nutrientTotals['NIA (mg)'].toFixed(2)}</td>
                        <td>${nutrientTotals['PANTAC (mg)'].toFixed(2)}</td>
                        <td>${nutrientTotals['VITB6 (mg)'].toFixed(2)}</td>
                        <td>${nutrientTotals['FOL (mcg)'].toFixed(2)}</td>
                    `;
                    mealTbody.insertBefore(tr, currentMealSummary);
                    
                    // 현재 음식의 영양 성분을 window.currentMealNutrition에 추가
                    window.currentMealNutrition.push(nutrientTotals);
                    updateCurrentMealSummary(); // "Current Meal" 요약 업데이트
                } else {
                    console.error('Element with ID "nutrition-tbody" not found');
                }
                

                // for (var key in nutrientTotals) {
                //     if (nutrientTotals.hasOwnProperty(key)) {
                //         var elementId = `current-food-${key.replace(/[^a-z0-9]/gi, '').toLowerCase()}`;
                //         var element = document.getElementById(elementId);
                //         if (element) {
                //             element.textContent = nutrientTotals[key].toFixed(2);
                //             // console.log(`Updated ${elementId} with value: ${nutrientTotals[key].toFixed(2)}`);
                //         } else {
                //             console.error(`Element with ID ${elementId} not found`);
                //         }
                //     }
                // }
            }
        })
        .catch(error => {
            console.error('Error fetching nutrition data:', error);
        });
    })
    .catch(error => {
        console.error('Error fetching ingredient codes:', error);
    });
}

function updateCurrentMealSummary() {
    var nutrientTotals = {
        'ENERC (kcal)': 0, 'WATER (g)': 0, 'PROTCNT (g)': 0, 'FAT (g)': 0, 
        'CHOAVLDF (g)': 0, 'FIBTG (g)': 0, 'CA (mg)': 0, 'FE (mg)': 0, 
        'ZN (mg)': 0, 'VITA_RAE (mcg)': 0, 'VITD (mcg)': 0, 'THIA (mg)': 0, 'RIBF (mg)': 0, 
        'NIA (mg)': 0, 'PANTAC (mg)': 0, 'VITB6 (mg)': 0, 'FOL (mcg)': 0
    };

    window.currentMealNutrition.forEach(nutrient => {
        for (var key in nutrientTotals) {
            if (nutrient.hasOwnProperty(key)) {
                nutrientTotals[key] += nutrient[key];
            }
        }
    });

    document.getElementById('current-meal-enerckcal').textContent = nutrientTotals['ENERC (kcal)'].toFixed(2);
    document.getElementById('current-meal-waterg').textContent = nutrientTotals['WATER (g)'].toFixed(2);
    document.getElementById('current-meal-protcntg').textContent = nutrientTotals['PROTCNT (g)'].toFixed(2);
    document.getElementById('current-meal-fatg').textContent = nutrientTotals['FAT (g)'].toFixed(2);
    document.getElementById('current-meal-choavldfg').textContent = nutrientTotals['CHOAVLDF (g)'].toFixed(2);
    document.getElementById('current-meal-fibtgg').textContent = nutrientTotals['FIBTG (g)'].toFixed(2);
    document.getElementById('current-meal-camg').textContent = nutrientTotals['CA (mg)'].toFixed(2);
    document.getElementById('current-meal-femg').textContent = nutrientTotals['FE (mg)'].toFixed(2);
    document.getElementById('current-meal-znmg').textContent = nutrientTotals['ZN (mg)'].toFixed(2);
    document.getElementById('current-meal-vitaraemcg').textContent = nutrientTotals['VITA_RAE (mcg)'].toFixed(2);
    document.getElementById('current-meal-vitdmcg').textContent = nutrientTotals['VITD (mcg)'].toFixed(2);
    document.getElementById('current-meal-thiamg').textContent = nutrientTotals['THIA (mg)'].toFixed(2);
    document.getElementById('current-meal-ribfmg').textContent = nutrientTotals['RIBF (mg)'].toFixed(2);
    document.getElementById('current-meal-niamg').textContent = nutrientTotals['NIA (mg)'].toFixed(2);
    document.getElementById('current-meal-pantacmg').textContent = nutrientTotals['PANTAC (mg)'].toFixed(2);
    document.getElementById('current-meal-vitb6mg').textContent = nutrientTotals['VITB6 (mg)'].toFixed(2);
    document.getElementById('current-meal-folmcg').textContent = nutrientTotals['FOL (mcg)'].toFixed(2);
}

// 영양성분 테이블 - Daily Total
// function calculateDailyTotal(data) {
//     var categories = ['Breakfast', 'Morning snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'Midnight Snack'];
//     var dailyNutrition = {
//         'ENERC (kcal)': 0, 'WATER (g)': 0, 'PROTCNT (g)': 0, 'FAT (g)': 0, 
//         'CHOAVLDF (g)': 0, 'FIBTG (g)': 0, 'CA (mg)': 0, 'FE (mg)': 0, 
//         'ZN (mg)': 0, 'VITA_RAE (mcg)': 0, 'VITD (mcg)': 0, 'THIA (mg)': 0, 'RIBF (mg)': 0, 
//         'NIA (mg)': 0, 'PANTAC (mg)': 0, 'VITB6 (mg)': 0, 'FOL (mcg)': 0
//     };

//     categories.forEach(category => {
//         if(data[category]){
//             data[category].forEach(food => {
//                 fetch('/get_ingredients', {
//                     method: 'POST',
//                     headers: {
//                         'Content-Type': 'application/json'
//                     },
//                     body: JSON.stringify({ foodCode: food['Food Code'] })
//                 })
//                 .then(response => response.json())
//                 .then(ingredientCodes => {
//                     fetch('/get_nutrition', {
//                         method: 'POST',
//                         headers: {
//                             'Content-Type': 'application/json'
//                         },
//                         body: JSON.stringify({ ingredientCodes: ingredientCodes })
//                     })
//                     .then(response => response.json())
//                     .then(nutritionData => {
//                         nutritionData.forEach(nutrient => {
//                             for (var key in nutrientTotals) {
//                                 if (nutrient.hasOwnProperty(key)) {
//                                     nutrientTotals[key] += parseFloat(nutrient[key]) || 0;
//                                 }
//                             }
//                         });

//                         updateDailyTotalSummary(nutrientTotals); // "Daily Total" 요약 업데이트
//                     });
//                 });
//             });
//         }
//         });
//     }


function calculateDailyTotal(data) {
    var nutrientTotals = {
        'ENERC (kcal)': 0, 'WATER (g)': 0, 'PROTCNT (g)': 0, 'FAT (g)': 0, 
        'CHOAVLDF (g)': 0, 'FIBTG (g)': 0, 'CA (mg)': 0, 'FE (mg)': 0, 
        'ZN (mg)': 0, 'VITA_RAE (mcg)': 0, 'VITD (mcg)': 0, 'THIA (mg)': 0, 'RIBF (mg)': 0, 
        'NIA (mg)': 0, 'PANTAC (mg)': 0, 'VITB6 (mg)': 0, 'FOL (mcg)': 0
    };

    var categories = ['Breakfast', 'Morning Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'Midnight Snack'];

    categories.forEach(category => {
        if (data[category]) {
            data[category].forEach(food => {
                fetch('/get_ingredients', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ foodCode: food['Food Code'] })
                })
                .then(response => response.json())
                .then(ingredientCodes => {
                    fetch('/get_nutrition', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ ingredientCodes: ingredientCodes })
                    })
                    .then(response => response.json())
                    .then(nutritionData => {
                        nutritionData.forEach(nutrient => {
                            for (var key in nutrientTotals) {
                                if (nutrient.hasOwnProperty(key)) {
                                    nutrientTotals[key] += parseFloat(nutrient[key]) || 0;
                                }
                            }
                        });

                        updateDailyTotalSummary(nutrientTotals); // "Daily Total" 요약 업데이트
                    });
                });
            });
        }
    });
}


    // console.log("데일리 토탈 foodCodes: ", foodCodes);

    // fetch('/get_ingredients', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify({ foodCode: foodCodes })
    // })
    // .then(response => response.json())
    // .then(ingredientCodes => {
    //     console.log('Received ingredient codes:', ingredientCodes);
    //     return fetch('/get_nutrition', {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json'
    //         },
    //         body: JSON.stringify({ ingredientCodes: ingredientCodes })
    //     });
    // })
    // .then(response => response.json())
    // .then(data => {
    //     console.log('Received nutrition data:', data);
    //     if (data.length > 0) {
    //         var nutrientTotals = {
    //             'ENERC (kcal)': 0, 'WATER (g)': 0, 'PROTCNT (g)': 0, 'FAT (g)': 0, 
    //             'CHOAVLDF (g)': 0, 'FIBTG (g)': 0, 'CA (mg)': 0, 'FE (mg)': 0, 
    //             'ZN (mg)': 0, 'VITA_RAE (mcg)': 0, 'VITD (mcg)': 0, 'THIA (mg)': 0, 'RIBF (mg)': 0, 
    //             'NIA (mg)': 0, 'PANTAC (mg)': 0, 'VITB6 (mg)': 0, 'FOL (mcg)': 0
    //         };

    //         data.forEach(nutrient => {
    //             for (var key in nutrientTotals) {
    //                 if (nutrient.hasOwnProperty(key)) {
    //                     nutrientTotals[key] += parseFloat(nutrient[key]) || 0;
    //                 }
    //             }
    //         });

    //         for (var key in nutrientTotals) {
    //             var elementId = `daily-total-${key.replace(/[^a-z0-9]/gi, '').toLowerCase()}`;
    //             var element = document.getElementById(elementId);
    //             if (element) {
    //                 element.textContent = nutrientTotals[key].toFixed(2);
    //             } else {
    //                 console.error(`Element with ID ${elementId} not found`);
    //             }
    //         }
    //     }
    // })
    // .catch(error => {
    //     console.error("Error fetching nutrition data: ", error);
    // });

function updateDailyTotalSummary(nutrientTotals) {
    document.getElementById('daily-total-enerckcal').textContent = nutrientTotals['ENERC (kcal)'].toFixed(2);
    document.getElementById('daily-total-waterg').textContent = nutrientTotals['WATER (g)'].toFixed(2);
    document.getElementById('daily-total-protcntg').textContent = nutrientTotals['PROTCNT (g)'].toFixed(2);
    document.getElementById('daily-total-fatg').textContent = nutrientTotals['FAT (g)'].toFixed(2);
    document.getElementById('daily-total-choavldfg').textContent = nutrientTotals['CHOAVLDF (g)'].toFixed(2);
    document.getElementById('daily-total-fibtgg').textContent = nutrientTotals['FIBTG (g)'].toFixed(2);
    document.getElementById('daily-total-camg').textContent = nutrientTotals['CA (mg)'].toFixed(2);
    document.getElementById('daily-total-femg').textContent = nutrientTotals['FE (mg)'].toFixed(2);
    document.getElementById('daily-total-znmg').textContent = nutrientTotals['ZN (mg)'].toFixed(2);
    document.getElementById('daily-total-vitaraemcg').textContent = nutrientTotals['VITA_RAE (mcg)'].toFixed(2);
    document.getElementById('daily-total-vitdmcg').textContent = nutrientTotals['VITD (mcg)'].toFixed(2);
    document.getElementById('daily-total-thiamg').textContent = nutrientTotals['THIA (mg)'].toFixed(2);
    document.getElementById('daily-total-ribfmg').textContent = nutrientTotals['RIBF (mg)'].toFixed(2);
    document.getElementById('daily-total-niamg').textContent = nutrientTotals['NIA (mg)'].toFixed(2);
    document.getElementById('daily-total-pantacmg').textContent = nutrientTotals['PANTAC (mg)'].toFixed(2);
    document.getElementById('daily-total-vitb6mg').textContent = nutrientTotals['VITB6 (mg)'].toFixed(2);
    document.getElementById('daily-total-folmcg').textContent = nutrientTotals['FOL (mcg)'].toFixed(2);
}

function loadIngredients(food) {
    // ingredientTableBody를 초기화합니다.
    var ingredientTableBody = document.getElementById('ingredientTableBody');
    ingredientTableBody.innerHTML = "";

    // 음식의 재료 정보를 가져옵니다.
    fetch(`/get_food_ingredients?foodCode=${food['Food Code']}`)
    .then(response => response.json())
    .then(data => {
        data.forEach(ingredient => {
            var tr = document.createElement("tr");
            tr.innerHTML = `<td>${ingredient['Ingredient Code']}</td><td>${ingredient['Ingrdient']}</td><td>${ingredient['1 person (g)']}</td>`;
            ingredientTableBody.appendChild(tr);
        });
    });
}

function loadData() {
    loadFoodList();
}

function copyData() {
    // Copy data functionality
}

function submitChartForm() {
        // Current Meal 행의 값을 가져오기
        document.getElementById('currentMealEnerckcal').value = document.getElementById('current-meal-enerckcal').innerText;
        document.getElementById('currentMealEnerckj').value = document.getElementById('current-meal-enerckj').innerText;
        document.getElementById('currentMealWaterg').value = document.getElementById('current-meal-waterg').innerText;
        document.getElementById('currentMealProtcntg').value = document.getElementById('current-meal-protcntg').innerText;
        document.getElementById('currentMealFatg').value = document.getElementById('current-meal-fatg').innerText;
        document.getElementById('currentMealChoavldfg').value = document.getElementById('current-meal-choavldfg').innerText;
        document.getElementById('currentMealFibtgg').value = document.getElementById('current-meal-fibtgg').innerText;
        document.getElementById('currentMealAshg').value = document.getElementById('current-meal-ashg').innerText;
        document.getElementById('currentMealCamg').value = document.getElementById('current-meal-camg').innerText;
        document.getElementById('currentMealFemg').value = document.getElementById('current-meal-femg').innerText;
        document.getElementById('currentMealZnmg').value = document.getElementById('current-meal-znmg').innerText;
        document.getElementById('currentMealVitaraemcg').value = document.getElementById('current-meal-vitaraemcg').innerText;
        document.getElementById('currentMealVitdmcg').value = document.getElementById('current-meal-vitdmcg').innerText;
        document.getElementById('currentMealThiamg').value = document.getElementById('current-meal-thiamg').innerText;
        document.getElementById('currentMealRibfmg').value = document.getElementById('current-meal-ribfmg').innerText;
        document.getElementById('currentMealNiamg').value = document.getElementById('current-meal-niamg').innerText;
        document.getElementById('currentMealPantacmg').value = document.getElementById('current-meal-pantacmg').innerText;
        document.getElementById('currentMealVitb6mg').value = document.getElementById('current-meal-vitb6mg').innerText;
        document.getElementById('currentMealFolmcg').value = document.getElementById('current-meal-folmcg').innerText;
        // 폼 제출
        document.getElementById('chartForm').submit();
}



