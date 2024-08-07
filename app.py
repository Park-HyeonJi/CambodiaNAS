from flask import Flask, render_template, redirect, url_for, request, jsonify
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
import pandas as pd
import numpy as np
import os
import logging
from logging.handlers import RotatingFileHandler
from barchart import barchart; 
from radarchart import radarchart;
  
app = Flask(__name__)
app.secret_key = 'your_secret_key'

# 로깅 설정
handler = RotatingFileHandler('error.log', maxBytes=10000, backupCount=1)
handler.setLevel(logging.ERROR)
app.logger.addHandler(handler)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

users = {'ddd': {'password': 'password'}}

class User(UserMixin):
    def __init__(self, id):
        self.id = id

    def get_id(self):
        return self.id

@login_manager.user_loader
def load_user(user_id):
    return User(user_id)

@app.route('/')
def base():
    if current_user.is_authenticated:
        return redirect(url_for('m_group'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        if username in users and users[username]['password'] == password:
            user = User(username)
            login_user(user)
            return redirect(url_for('m_group'))

        return redirect(url_for('login'))
    
    return render_template('login.html')

@app.route('/m-group')
@login_required
def m_group():
    return render_template('m_group.html')

@app.route('/m-person')
@login_required
def m_person():
    return render_template('m_person.html')

@app.route('/24h')
@login_required
def tfh():
    return render_template('24h.html')

@app.route('/24h-stas')
@login_required
def tfh_stas():
    return render_template('24h_stas.html')

@app.route('/24h-excel')
@login_required
def tfh_excel():
    return render_template('24h_excel.html')

@app.route('/db-food')
@login_required
def db_food():
    return render_template('db_food.html')

@app.route('/db-nutri')
@login_required
def db_nutri():
    return render_template('db_nutri.html')

@app.route('/uchang') #########################  Uchang
@login_required
def uchang():
    return render_template('uchang.html')

@app.route('/search_food', methods=['POST'])
@login_required
def search_food():
    try:
        data = request.get_json()
        search_type = data['searchType']
        search_value = data['searchValue']
        
        food_data_path = 'data/CambodiaFood_test.xlsx'
        food_data = pd.read_excel(food_data_path)
        
        if search_type == "code":
            results = food_data[food_data['Food Code'].astype(str).str.contains(search_value, na=False, case=False)]
        else:
            results = food_data[food_data['Food Name'].str.contains(search_value, na=False, case=False)]
        
        results = results.drop_duplicates(subset=['Food Code', 'Food Name', 'Ingredient Code'])
        results = results[['Food Code', 'Food Name', 'Ingredient Code']]
        
        return jsonify(results.to_dict(orient='records'))
    except Exception as e:
        app.logger.error(f"Error in search_food: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/add_food', methods=['POST'])
@login_required
def add_food():
    try:
        data = request.get_json()
        food_code = data['foodCode']
        food_name = data['foodName']
        time_category = data['timeCategory']
        user_group = data['userGroup']
        user_id = data['userID']
        view_date = data['viewDate']

        food_data_path = 'data/CambodiaFood_test.xlsx'
        food_data = pd.read_excel(food_data_path)
        
        selected_food_data = food_data[food_data['Food Name'] == food_name]

        user_data = load_user_data(user_group, user_id, view_date)
        if time_category not in user_data:
            user_data[time_category] = []
        
        user_data[time_category].extend(selected_food_data.to_dict(orient='records'))
        save_user_data(user_group, user_id, view_date, user_data)

        return jsonify({'status': 'success'})
    except Exception as e:
        app.logger.error(f"Error in add_food: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/get_food_list', methods=['GET'])
@login_required
def get_food_list():
    try:
        user_group = request.args.get('userGroup')
        user_id = request.args.get('userID')
        view_date = request.args.get('viewDate')

        user_data = load_user_data(user_group, user_id, view_date)
        return jsonify(user_data)
    except Exception as e:
        app.logger.error(f"Error in get_food_list: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

def load_user_data(user_group, user_id, view_date):
    file_path = f'data/{user_group}_{user_id}_{view_date}.xlsx'
    if os.path.exists(file_path):
        xls = pd.ExcelFile(file_path)
        user_data = {sheet: xls.parse(sheet).to_dict(orient='records') for sheet in xls.sheet_names}
    else:
        user_data = {
            'Breakfast': [],
            'Morning snack': [],
            'Lunch': [],
            'Afternoon Snack': [],
            'Dinner': [],
            'Midnight Snack': []
        }
    return user_data

# 재료 코드
@app.route('/get_ingredients', methods=['POST'])
@login_required
def get_ingredients():
    try:
        data = request.get_json()
        food_codes = data['foodCode']

        if not isinstance(food_codes, list):
            food_codes = [food_codes]
        
        food_data_path = 'data/CambodiaFood_test.xlsx'
        food_data = pd.read_excel(food_data_path)
        
        ingredient_codes = []
        for food_code in food_codes:
            ingredients = food_data[food_data['Food Code'] == int(food_code)]['Ingredient Code'].tolist()
            ingredient_codes.extend(ingredients)
        # ingredients = food_data[food_data['Food Code'] == int(food_codes)]['Ingredient Code'].tolist()
        
        return jsonify(ingredient_codes)
    except Exception as e:
        app.logger.error(f"Error in get_ingredients: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# 영양 성분
@app.route('/get_nutrition', methods=['POST'])
@login_required
def get_nutrition():
    try:
        data = request.get_json()
        ingredient_codes = data['ingredientCodes']

        # ingredient_codes가 리스트인지 확인하고, 아니면 리스트로 변환
        if isinstance(ingredient_codes, int):
            ingredient_codes = [ingredient_codes]
        elif not isinstance(ingredient_codes, list):
            ingredient_codes = list(ingredient_codes)
        
        nutrition_data_path = 'data/FoodIngredient_test.xlsx'
        nutrition_data = pd.read_excel(nutrition_data_path)
        
        nutrition_info = nutrition_data[nutrition_data['ID Code'].isin(ingredient_codes)]
        nutrition_info = nutrition_info.replace({np.nan: 0})
        nutrition_info = nutrition_info.to_dict(orient='records')
        
        return jsonify(nutrition_info)
    except Exception as e:
        app.logger.error(f"Error in get_nutrition: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


def save_user_data(user_group, user_id, view_date, data):
    file_path = f'data/{user_group}_{user_id}_{view_date}.xlsx'
    with pd.ExcelWriter(file_path) as writer:
        for sheet_name, records in data.items():
            df = pd.DataFrame(records)
            df.to_excel(writer, sheet_name=sheet_name, index=False)

@app.route('/get_food_ingredients', methods=['GET'])
@login_required
def get_food_ingredients():
    try:
        food_code = request.args.get('foodCode')
        # 데이터 파일에서 음식 재료를 로드합니다.
        food_data_path = 'data/CambodiaFood_test.xlsx'
        food_data = pd.read_excel(food_data_path)

        ingredients = food_data[food_data['Food Code'] == int(food_code)].to_dict(orient='records')
        return jsonify(ingredients)
    except Exception as e:
        app.logger.error(f"Error in get_food_ingredients: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500
    
@app.route('/FoodGroupIntake')
@login_required
def FoodGroupIntake():
    return render_template('test2.html')

@app.route('/runchart', methods=['POST'])
def run_python_code():
    # 여기에 실행하고자 하는 Python 코드를 작성
    current_meal_data = {
        'enerckcal': request.form.get('currentMealEnerckcal'),
        'enerckj': request.form.get('currentMealEnerckj'),
        'waterg': request.form.get('currentMealWaterg'),
        'protcntg': request.form.get('currentMealProtcntg'),
        'fatg': request.form.get('currentMealFatg'),
        'choavldfg': request.form.get('currentMealChoavldfg'),
        'fibtgg': request.form.get('currentMealFibtgg'),
        'ashg': request.form.get('currentMealAshg'),
        'camg': request.form.get('currentMealCamg'),
        'femg': request.form.get('currentMealFemg'),
        'znmg': request.form.get('currentMealZnmg'),
        'vitaraemcg': request.form.get('currentMealVitaraemcg'),
        'vitdmcg': request.form.get('currentMealVitdmcg'),
        'thiamg': request.form.get('currentMealThiamg'),
        'ribfmg': request.form.get('currentMealRibfmg'),
        'niamg': request.form.get('currentMealNiamg'),
        'pantacmg': request.form.get('currentMealPantacmg'),
        'vitb6mg': request.form.get('currentMealVitb6mg'),
        'folmcg': request.form.get('currentMealFolmcg'),
    }
    result = radarchart(current_meal_data) 
    result = barchart(current_meal_data) 
    return render_template('24h_chart.html', result=result)




# 로그아웃
@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
