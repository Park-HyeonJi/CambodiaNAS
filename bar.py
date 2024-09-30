import pandas as pd
import numpy as np
from pyecharts import options as opts
from pyecharts.charts import Bar

def bar(current, gender, age):
    # print("Received gender:", gender)
    # print("Received age:", age)
    # Sample data for overall (assuming combined male and female data)
    # print('### len', len(current))

    if len(current)==0:
        overall_data = [2600, 60, 500, 13.7, 7, 700.0, 4, 70.0, 1, 1, 15.0, 500.0, 1000] 
    else:
        valuelist=[]
        value=list(current.values());
        print('### len', len(current));
        for x in range(len(current)):            
            if value[x]=='' or value[x]==None:
                valuelist.append(0.0)
            else: 
                valuelist.append(float(value[x]))
    overall_data=valuelist; #print('### over_all=', overall_data)
    
    if gender == 'male':
        gender = 'men'
    elif gender == 'female':
        gender = 'women'
    else:
        gender = 'men'
   
    recommends = pd.read_excel('data/NutritionRecommends.xlsx')
    print('***', type(gender), type(age))
    # gender='men'; age=0; dafault value
    if gender == '': gender= 'men'
    if age=='': age=30
    cond = (recommends.Gender == gender) & (recommends.Age.astype(int) == int(age))
    print(recommends[cond])
    recom = recommends[cond].iloc[0, 2:]
    recomlist = np.array(recom); print('recomlist=', recomlist)
    
    # Calculate the nutrition percentages
    nutritionpercent = []
    for i in range(len(overall_data)):
        v = int(round((overall_data[i] / recomlist[i]) * 100, 0))
        if v >= 250: v = 250  # More than 250%, set as 250
        nutritionpercent.append(v)
    overall_data = nutritionpercent
    
    # Categories as specified
    categories = [
        "Energy", "Protein", "CA", "FE", "ZN", "Vit.A",
        "Vit.B1", "Vit.B2", "Vit.B3", "Folate", "Vit.C", "Vit.D", "NA"
    ]
    
    # Create a bar chart
    bar = Bar()    
    bar.add_yaxis(
        series_name="Below 100%",
        y_axis=[None]*len(categories),  # Dummy data
        itemstyle_opts=opts.ItemStyleOpts(color="#FFC0CB"),
        label_opts=opts.LabelOpts(is_show=False)
    )
    bar.add_yaxis(
        series_name="100% and above",
        y_axis=[None]*len(categories),  # Dummy data
        itemstyle_opts=opts.ItemStyleOpts(color="#ADD8E6"),
        label_opts=opts.LabelOpts(is_show=False)
    ) 
    # Add the categories to the x-axis
    bar.add_xaxis(categories)        
    # Add the overall data to the y-axis with conditional color formatting
    bar.add_yaxis(
        series_name="",
        y_axis=[{
            "value": value,
            "itemStyle": {
                "color": "#FFC0CB" if value < 100 else "#ADD8E6"  # Conditional color formatting
            }
        } for value in overall_data],
        markline_opts=opts.MarkLineOpts(
            data=[opts.MarkLineItem(y=100, name='Target Line')],
            linestyle_opts=opts.LineStyleOpts(color="#F08080", type_='dashed')),
        category_gap='10%',  # Adjust the gap between bars to make bars wider
        bar_width='80%'  # Set the bar width explicitly
    )
    # Add dummy series for legend 
    # Set global options
    bar.set_global_opts(
        title_opts=opts.TitleOpts(
            title="Nutritional Intake Ratios",
            title_textstyle_opts=opts.TextStyleOpts(font_size=16)
        ),
        xaxis_opts=opts.AxisOpts(
            type_="category",
            name="Nutritions",
            axislabel_opts=opts.LabelOpts(rotate=0),  # Rotate labels to fit them
            boundary_gap=True  # Ensure bars are centered in their categories
        ),
        yaxis_opts=opts.AxisOpts(name="Intake Ratio (%)", max_=250),
        legend_opts=opts.LegendOpts(is_show=True)
    )    
    # Render the chart
    bar.render("./templates/bar.html")

# Test
#bar([], 30, 'men')