import pandas as pd; import numpy as np
from pyecharts import options as opts
from pyecharts.charts import Bar

def bar(current_meal_data):
    # Sample data for overall (assuming combined male and female data)
    overall_data = [2600,60,500,13.7,7,700.0,4,70.0,1,1,15.0,500.0]
    
    recommends=pd.read_excel('data/NutritionRecommends.xlsx')
    gender='men'; age=30;
    cond=(recommends.Gender==gender) & (recommends.Age==age); 
    recom=recommends[cond].iloc[0,2:]; recomlist=np.array(recom); print(recomlist)
    nutritionpercent=[]
    for i in range(len(overall_data)):
            v=int(round((overall_data[i]/recomlist[i])*100,0))
            if v >= 250: v=250; # more than 250%, set as 250
            nutritionpercent.append( v )
    overall_data=nutritionpercent
    # Categories as specified
    categories = [
        "Energy", "Protein", "CA", "FE", "ZN", "Vita A",
        "Vita B1", "Vita B2", "Vita B3", "Folic", "Vita C", "Vita D"
    ]
    
    # Create a bar chart
    bar = Bar()
    
    # Add the categories to the x-axis
    bar.add_xaxis(categories)
    
    # Add the overall data to the y-axis with conditional color formatting
    bar.add_yaxis(
        series_name="Overall",
        y_axis=[{
            "value": value,
            "itemStyle": {
                "color": "#FFC0CB" if value < 100 else "#ADD8E6"  # Conditional color formatting
            }
        } for value in overall_data]
    )
    
    # Set global options
    bar.set_global_opts(
        title_opts=opts.TitleOpts(
            title="Nutritional Intake Ratios",
            title_textstyle_opts=opts.TextStyleOpts(font_size=16)
        ),
        xaxis_opts=opts.AxisOpts(
            name="Nutritions",
            axislabel_opts=opts.LabelOpts(rotate=0)  # Rotate labels to fit them
        ),
        yaxis_opts=opts.AxisOpts(name="Intake Ratio (%)", max_=250)
    )
    
    # Render the chart
    bar.render("./templates/bar.html")
    
    
