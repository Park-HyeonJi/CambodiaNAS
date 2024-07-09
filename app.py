from flask import Flask, render_template, redirect, url_for, request, jsonify
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
import pandas as pd

app = Flask(__name__)
app.secret_key = 'your_secret_key'

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

@app.route('/search_food', methods=['POST'])
@login_required
def search_food():
    data = request.get_json()
    search_type = data['searchType']
    search_value = data['searchValue']
    
    food_data_path = 'data/CambodiaFood_test.xlsx'
    food_data = pd.read_excel(food_data_path)
    
    if search_type == "code":
        results = food_data[food_data['Food Code'].astype(str).str.contains(search_value, na=False, case=False)]
    else:
        results = food_data[food_data['Food Name'].str.contains(search_value, na=False, case=False)]
    
    # 중복 값 제거
    results = results.drop_duplicates(subset=['Food Code', 'Food Name'])

    # 필요한 열만 선택
    results = results[['Food Code', 'Food Name']]

    return jsonify(results.to_dict(orient='records'))

# 로그아웃
@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(debug=True)
