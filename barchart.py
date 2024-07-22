# -*- coding: utf-8 -*-
"""
Created on Wed Jul 17 11:13:19 2024

@author: Park
"""

import plotly.graph_objects as go
import pandas as pd


def barchart(current_meal_data):    
    # Define the data
    print(current_meal_data)
    nutrients = [
        'Vitamin A(μg RAE)', 'Riboflavin(mg)', 'Calcium(mg)', 'Sodium(mg)', 'Iron(mg)', 'Folic acid(μg)', 'Iodine(μg)', 
        'Zinc(mg)', 'Copper(μg)']
    
    # Provided data (matching the order of nutrients)
    data = {
        'Nutrients': nutrients,
        'lower limit': [60, 100, 500, 1000, 18, 400, 90, 50, 700],
        'upper limit': [120, 150, 1000, 2300, 38, 600, 110, 80, 1000],
        'Consumption': [130, 90, 600, 2200, 30, 700, 95, 70, 800]
    }
    
    # Create DataFrame
    df = pd.DataFrame(data)
    
    # Define maximum range for scaling bars
    max_limit = max(df['upper limit'])
    
    # Function to normalize values
    def normalize(value, lower, upper):
        return (value - lower) / (upper - lower)
    
    # Create a bar chart
    fig = go.Figure()
    
    added_status = {'Below Lower Limit': False, 'Within Limits': False, 'Above Upper Limit': False}
    
    for i, nutrient in enumerate(df['Nutrients']):
        lower = df['lower limit'][i]
        upper = df['upper limit'][i]
        intake = df['Consumption'][i]
        
        # Determine the color of the bar based on the intake value
        if intake < lower:
            color = 'yellow'
            status = 'Below Lower Limit'
        elif lower <= intake <= upper:
            color = 'lightgreen'
            status = 'Within Limits'
        else:
            color = 'pink'
            status = 'Above Upper Limit'
        
        # Normalize the positions
        lower_position = 0.33 * max_limit  # 1/3 of the bar
        upper_position = 0.66 * max_limit  # 2/3 of the bar
        intake_position = normalize(intake, lower, upper) * (upper_position - lower_position) + lower_position
        
        # Add bar for the total range
        fig.add_trace(go.Bar(
            x=[max_limit],
            y=[nutrient],
            orientation='h',
            marker=dict(color=color),
            name=status if not added_status[status] else None,
            text=[f'<b style="color:blue">{intake}</b>'], textposition='outside',
            showlegend=False
        ))
        added_status[status] = True
    
        # Add markers for the lower and upper limits with 'L' and 'H' labels
        fig.add_trace(go.Scatter(
            x=[lower_position],
            y=[nutrient],
            mode='markers+text',
            marker=dict(color='black', symbol='line-ns-open', size=12),
            text=['L'],
            textposition='middle right',
            name='Lower limit',
            showlegend=False
        ))
    
        fig.add_trace(go.Scatter(
            x=[upper_position],
            y=[nutrient],
            mode='markers+text',
            marker=dict(color='black', symbol='line-ns-open', size=12),
            text=['H'],
            textposition='middle right',
            name='Upper limit',
            showlegend=False
        ))
    
        # Add marker for actual intake
        fig.add_trace(go.Scatter(
            x=[intake_position],
            y=[nutrient],
            mode='markers+text',
            marker=dict(color='red', symbol='triangle-up', size=12),
            text=[f'<b style="color:blue">{intake}</b>'],
            textposition='middle right',
            name='Intake',
            showlegend=False
        ))
    
    # Update layout
    fig.update_layout(
        title='Mineral Values Bar Chart',
        xaxis_title='Intake (L: Intake Low Value, H: Intake High Value)',
        yaxis_title='Nutritions',
        yaxis=dict(categoryorder='array', categoryarray=nutrients[::-1]),  # Display vitamins from top to bottom
        xaxis=dict(showticklabels=False),
        height=600,
        width=800,
        legend=dict(
            orientation='h',
            yanchor='top',
            y=-0.3,
            xanchor='center',
            x=0.5,
            traceorder='normal'
        )
    )
    
    # Add the correct legend entries manually
    fig.add_trace(go.Bar(
        x=[0],
        y=[0],
        marker=dict(color='yellow'),
        name='Below Lower Limit',
        showlegend=True
    ))
    
    fig.add_trace(go.Bar(
        x=[0],
        y=[0],
        marker=dict(color='lightgreen'),
        name='Within Limits',
        showlegend=True
    ))
    
    fig.add_trace(go.Bar(
        x=[0],
        y=[0],
        marker=dict(color='pink'),
        name='Above Upper Limit',
        showlegend=True
    ))
    
    # Save the plot as an HTML file
    fig.write_html("./templates/barchart.html")

print("Plot saved as nutrient_status.html")
