 // ========== GLOBAL STATE ==========
        let userProfile = null;
        let weeklyChart = null;

        // ========== UTILITY FUNCTIONS ==========
        function getTodayKey() {
            return new Date().toISOString().split('T')[0];
        }

        function getTodayLog() {
            const key = `dailyLog_${getTodayKey()}`;
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : {
                date: getTodayKey(),
                foods: [],
                exercises: [],
                caloriesEaten: 0,
                caloriesBurned: 0,
                netCalories: 0,
                proteinConsumed: 0
            };
        }

        function saveTodayLog(log) {
            const key = `dailyLog_${getTodayKey()}`;
            localStorage.setItem(key, JSON.stringify(log));
        }

        // ========== PROFILE MANAGEMENT ==========
        function loadProfile() {
            const stored = localStorage.getItem('userProfile');
            userProfile = stored ? JSON.parse(stored) : null;
        }

        function saveProfile() {
            localStorage.setItem('userProfile', JSON.stringify(userProfile));
        }

        // ========== CALCULATIONS ==========
        function calculateBMR(gender, weight, height, age) {
            if (gender === 'male') {
                return (10 * weight) + (6.25 * height) - (5 * age) + 5;
            } else {
                return (10 * weight) + (6.25 * height) - (5 * age) - 161;
            }
        }

        function calculateTDEE(bmr, activityLevel) {
            return Math.round(bmr * parseFloat(activityLevel));
        }

        function calculateDailyTarget(tdee, goal) {
            if (goal === 'loss') return tdee - 500;
            if (goal === 'gain') return tdee + 300;
            return tdee;
        }

        // ========== ENHANCED NUTRITION DATABASE ==========
        async function fetchNutrition(query) {
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const foodDatabase = {
                // Indian Foods
                'roti': { calories: 71, protein: 3, carbs: 15, fat: 0.4 },
                'chapati': { calories: 71, protein: 3, carbs: 15, fat: 0.4 },
                'naan': { calories: 262, protein: 9, carbs: 45, fat: 5 },
                'paratha': { calories: 126, protein: 3, carbs: 18, fat: 5 },
                'rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
                'biryani': { calories: 200, protein: 8, carbs: 35, fat: 5 },
                'dal': { calories: 116, protein: 9, carbs: 20, fat: 0.5 },
                'rajma': { calories: 127, protein: 8.7, carbs: 22.8, fat: 0.5 },
                'chole': { calories: 164, protein: 8.9, carbs: 27, fat: 2.6 },
                'chickpeas': { calories: 164, protein: 8.9, carbs: 27, fat: 2.6 },
                'paneer': { calories: 265, protein: 18, carbs: 1.2, fat: 21 },
                'dosa': { calories: 168, protein: 4, carbs: 28, fat: 4 },
                'idli': { calories: 58, protein: 2, carbs: 12, fat: 0.2 },
                'samosa': { calories: 262, protein: 5, carbs: 26, fat: 16 },
                'pakora': { calories: 200, protein: 4, carbs: 20, fat: 12 },
                'poha': { calories: 250, protein: 6, carbs: 48, fat: 3 },
                'upma': { calories: 200, protein: 5, carbs: 35, fat: 4 },
                'khichdi': { calories: 150, protein: 5, carbs: 30, fat: 1 },
                'raita': { calories: 40, protein: 2, carbs: 5, fat: 1.5 },
                'lassi': { calories: 140, protein: 6, carbs: 20, fat: 4 },
                'ghee': { calories: 112, protein: 0, carbs: 0, fat: 12.7 },
                'butter': { calories: 102, protein: 0.1, carbs: 0.1, fat: 11.5 },
                
                // Common Foods
                'chicken': { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
                'mutton': { calories: 294, protein: 25, carbs: 0, fat: 21 },
                'fish': { calories: 206, protein: 22, carbs: 0, fat: 12 },
                'egg': { calories: 70, protein: 6, carbs: 0.6, fat: 5 },
                'banana': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
                'bread': { calories: 265, protein: 9, carbs: 49, fat: 3.2 },
                'milk': { calories: 42, protein: 3.4, carbs: 5, fat: 1 },
                'apple': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
                'orange': { calories: 47, protein: 0.9, carbs: 12, fat: 0.1 },
                'mango': { calories: 60, protein: 0.8, carbs: 15, fat: 0.4 },
                'salmon': { calories: 208, protein: 20, carbs: 0, fat: 13 },
                'pasta': { calories: 131, protein: 5, carbs: 25, fat: 1.1 },
                'yogurt': { calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
                'curd': { calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
                'potato': { calories: 77, protein: 2, carbs: 17, fat: 0.1 },
                'aloo': { calories: 77, protein: 2, carbs: 17, fat: 0.1 },
                'tomato': { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
                'onion': { calories: 40, protein: 1.1, carbs: 9, fat: 0.1 },
                'carrot': { calories: 41, protein: 0.9, carbs: 10, fat: 0.2 },
                'spinach': { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
                'broccoli': { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
                'almond': { calories: 579, protein: 21, carbs: 22, fat: 50 },
                'cashew': { calories: 553, protein: 18, carbs: 30, fat: 44 },
                'peanut': { calories: 567, protein: 26, carbs: 16, fat: 49 },
                'oats': { calories: 389, protein: 17, carbs: 66, fat: 7 },
            };
            
            const regex = /(\d+\.?\d*)\s*(g|grams?|eggs?|roti|rotis|chapati|chapatis|slices?|cups?|pcs?|pieces?|piece|bowl|bowls|plate|plates|spoon|spoons|tbsp|tsp)?\s*(.+)/i;
            const match = query.toLowerCase().match(regex);
            
            if (!match) return null;
            
            const amount = parseFloat(match[1]);
            const unit = match[2];
            const foodName = match[3].trim();
            
            const food = Object.keys(foodDatabase).find(key => foodName.includes(key));
            if (!food) return null;
            
            const baseData = foodDatabase[food];
            let multiplier = 1;
            
            // Handle different units
            if (unit?.match(/g|grams?/i)) {
                multiplier = amount / 100;
            } else if (unit?.match(/cup|cups|bowl|bowls/i)) {
                multiplier = amount * 2; // Assuming 1 cup = 200g
            } else if (unit?.match(/plate|plates/i)) {
                multiplier = amount * 3; // Assuming 1 plate = 300g
            } else if (unit?.match(/spoon|spoons|tbsp/i)) {
                multiplier = amount * 0.15; // Assuming 1 tbsp = 15g
            } else if (unit?.match(/tsp/i)) {
                multiplier = amount * 0.05; // Assuming 1 tsp = 5g
            } else {
                multiplier = amount; // For items like eggs, rotis
            }
            
            return {
                name: query,
                calories: Math.round(baseData.calories * multiplier),
                protein: Math.round(baseData.protein * multiplier),
                carbs: Math.round(baseData.carbs * multiplier),
                fat: Math.round(baseData.fat * multiplier)
            };
        }

        // ========== EXERCISE CALCULATIONS ==========
        const metValues = {
            'walking': 3.5,
            'running': 9.8,
            'cycling': 7.5,
            'swimming': 8.0,
            'gym': 5.5,
            'yoga': 3.0,
            'hiit': 10.0,
            'sports': 6.0
        };

        function calculateCaloriesBurned(activity, durationMinutes, weightKg) {
            const met = metValues[activity.toLowerCase()] || 5.0;
            const hours = durationMinutes / 60;
            return Math.round(met * weightKg * hours);
        }

        // ========== GOAL PREDICTION ==========
        function calculateDaysToGoal(currentWeight, targetWeight, dailyDeficit) {
            const weightDifference = Math.abs(currentWeight - targetWeight);
            const caloriesNeeded = weightDifference * 7700;
            
            if (dailyDeficit <= 0) {
                return {
                    days: null,
                    date: null,
                    message: "Keep tracking to see your prediction!"
                };
            }
            
            const daysNeeded = Math.ceil(caloriesNeeded / dailyDeficit);
            const goalDate = new Date();
            goalDate.setDate(goalDate.getDate() + daysNeeded);
            
            return {
                days: daysNeeded,
                date: goalDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                }),
                message: null
            };
        }

        // ========== CHART FUNCTIONS ==========
        function getLast7DaysData() {
            const data = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateKey = date.toISOString().split('T')[0];
                
                const dayData = JSON.parse(
                    localStorage.getItem(`dailyLog_${dateKey}`) || '{}'
                );
                
                data.push({
                    date: date.toLocaleDateString('en-US', { weekday: 'short' }),
                    caloriesIn: dayData.caloriesEaten || 0,
                    caloriesOut: dayData.caloriesBurned || 0
                });
            }
            return data;
        }

        function initChart() {
            const weeklyData = getLast7DaysData();
            const ctx = document.getElementById('weeklyChart').getContext('2d');
            
            if (weeklyChart) {
                weeklyChart.destroy();
            }
            
            weeklyChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: weeklyData.map(d => d.date),
                    datasets: [
                        {
                            label: 'Calories In',
                            data: weeklyData.map(d => d.caloriesIn),
                            backgroundColor: '#10b981',
                            borderRadius: 8
                        },
                        {
                            label: 'Calories Out',
                            data: weeklyData.map(d => d.caloriesOut),
                            backgroundColor: '#ef4444',
                            borderRadius: 8
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    animation: {
                        duration: 1000,
                        easing: 'easeOutQuart'
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: getComputedStyle(document.documentElement)
                                    .getPropertyValue('--text-primary').trim(),
                                font: {
                                    size: 12,
                                    weight: '600'
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: getComputedStyle(document.documentElement)
                                    .getPropertyValue('--text-secondary').trim()
                            },
                            grid: {
                                color: getComputedStyle(document.documentElement)
                                    .getPropertyValue('--border-color').trim()
                            }
                        },
                        x: {
                            ticks: {
                                color: getComputedStyle(document.documentElement)
                                    .getPropertyValue('--text-secondary').trim()
                            },
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }

        // ========== DASHBOARD UPDATE ==========
        function updateDashboard() {
            if (!userProfile) return;
            
            const log = getTodayLog();
            
            // Update calorie info banner
            document.getElementById('maintenanceCalories').textContent = userProfile.TDEE;
            document.getElementById('recommendedCalories').textContent = userProfile.dailyTarget;
            const deficit = userProfile.TDEE - userProfile.dailyTarget;
            document.getElementById('dailyDeficit').textContent = deficit > 0 ? `-${deficit}` : `+${Math.abs(deficit)}`;
            
            // Update metric cards
            document.getElementById('caloriesEaten').textContent = log.caloriesEaten;
            document.getElementById('caloriesBurned').textContent = log.caloriesBurned;
            document.getElementById('netCalories').textContent = log.caloriesEaten - log.caloriesBurned;
            document.getElementById('targetCalories').textContent = userProfile.dailyTarget;
            
            // Update prediction
            const dailyDeficit = userProfile.TDEE - (log.caloriesEaten - log.caloriesBurned);
            const prediction = calculateDaysToGoal(
                userProfile.currentWeight,
                userProfile.targetWeight,
                dailyDeficit
            );
            
            const predictionEl = document.getElementById('predictionText');
            if (prediction.message) {
                predictionEl.textContent = prediction.message;
                document.getElementById('daysToGoal').textContent = '--';
            } else {
                predictionEl.innerHTML = `
                    At your current pace, you will reach 
                    <strong>${userProfile.targetWeight}kg</strong> on 
                    <strong>${prediction.date}</strong> 
                    (in ${prediction.days} days)
                `;
                document.getElementById('daysToGoal').textContent = prediction.days;
            }
            
            // Update food list
            updateFoodList();
            updateExerciseList();
            
            // Update chart
            initChart();
        }

        function updateFoodList() {
            const log = getTodayLog();
            const foodList = document.getElementById('foodList');
            
            if (log.foods.length === 0) {
                foodList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-utensils"></i>
                        <p>No meals logged yet</p>
                    </div>
                `;
                return;
            }
            
            foodList.innerHTML = log.foods.map(food => `
                <div class="log-item">
                    <div class="log-item-info">
                        <div class="log-item-name">${food.name}</div>
                        <div class="log-item-calories">
                            <span class="cal-value">${food.calories}</span> cal
                            ${food.protein ? ` • ${food.protein}g protein` : ''}
                        </div>
                    </div>
                    <button class="delete-btn" onclick="deleteFood('${food.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');
        }

        function updateExerciseList() {
            const log = getTodayLog();
            const exerciseList = document.getElementById('exerciseList');
            
            if (log.exercises.length === 0) {
                exerciseList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-running"></i>
                        <p>No activities logged yet</p>
                    </div>
                `;
                return;
            }
            
            exerciseList.innerHTML = log.exercises.map(exercise => `
                <div class="log-item">
                    <div class="log-item-info">
                        <div class="log-item-name">${exercise.activity.charAt(0).toUpperCase() + exercise.activity.slice(1)}</div>
                        <div class="log-item-calories">
                            ${exercise.duration} min • <span class="cal-value">${exercise.caloriesBurned}</span> cal burned
                        </div>
                    </div>
                    <button class="delete-btn" onclick="deleteExercise('${exercise.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');
        }

        // ========== ADD FOOD ==========
        async function addFood() {
            const input = document.getElementById('foodInput');
            const query = input.value.trim();
            
            if (!query) {
                input.classList.add('shake');
                setTimeout(() => input.classList.remove('shake'), 300);
                return;
            }
            
            const btn = document.getElementById('addFoodBtn');
            btn.disabled = true;
            btn.innerHTML = '<div class="spinner"></div>';
            
            try {
                const foodData = await fetchNutrition(query);
                
                if (!foodData) {
                    alert('Food not found. Try: "100g chicken", "2 roti", "1 cup dal", "3 eggs" etc.');
                    return;
                }
                
                const log = getTodayLog();
                const newFood = {
                    id: `f${Date.now()}`,
                    ...foodData,
                    timestamp: new Date().toISOString()
                };
                
                log.foods.push(newFood);
                log.caloriesEaten += foodData.calories;
                log.proteinConsumed += foodData.protein || 0;
                log.netCalories = log.caloriesEaten - log.caloriesBurned;
                
                saveTodayLog(log);
                updateDashboard();
                input.value = '';
            } catch (error) {
                console.error('Error adding food:', error);
                alert('Failed to add food. Please try again.');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-plus"></i> Add Food';
            }
        }

        // ========== ADD EXERCISE ==========
        function addExercise() {
            const activityType = document.getElementById('activityType').value;
            const duration = parseInt(document.getElementById('exerciseDuration').value);
            
            if (!duration || duration <= 0) {
                const input = document.getElementById('exerciseDuration');
                input.classList.add('shake');
                setTimeout(() => input.classList.remove('shake'), 300);
                return;
            }
            
            const caloriesBurned = calculateCaloriesBurned(
                activityType,
                duration,
                userProfile.currentWeight
            );
            
            const log = getTodayLog();
            const newExercise = {
                id: `e${Date.now()}`,
                activity: activityType,
                duration: duration,
                caloriesBurned: caloriesBurned,
                timestamp: new Date().toISOString()
            };
            
            log.exercises.push(newExercise);
            log.caloriesBurned += caloriesBurned;
            log.netCalories = log.caloriesEaten - log.caloriesBurned;
            
            saveTodayLog(log);
            updateDashboard();
            
            document.getElementById('exerciseDuration').value = '';
        }

        // ========== DELETE FUNCTIONS ==========
        function deleteFood(id) {
            const log = getTodayLog();
            const food = log.foods.find(f => f.id === id);
            
            if (food) {
                log.caloriesEaten -= food.calories;
                log.proteinConsumed -= food.protein || 0;
                log.foods = log.foods.filter(f => f.id !== id);
                log.netCalories = log.caloriesEaten - log.caloriesBurned;
                
                saveTodayLog(log);
                updateDashboard();
            }
        }

        function deleteExercise(id) {
            const log = getTodayLog();
            const exercise = log.exercises.find(e => e.id === id);
            
            if (exercise) {
                log.caloriesBurned -= exercise.caloriesBurned;
                log.exercises = log.exercises.filter(e => e.id !== id);
                log.netCalories = log.caloriesEaten - log.caloriesBurned;
                
                saveTodayLog(log);
                updateDashboard();
            }
        }

        // ========== ONBOARDING ==========
        document.getElementById('onboardingForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('userName').value;
            const gender = document.querySelector('input[name="gender"]:checked').value;
            const age = parseInt(document.getElementById('userAge').value);
            const height = parseInt(document.getElementById('userHeight').value);
            const currentWeight = parseFloat(document.getElementById('currentWeight').value);
            const targetWeight = parseFloat(document.getElementById('targetWeight').value);
            const activityLevel = document.getElementById('activityLevel').value;
            const goal = document.querySelector('input[name="goal"]:checked').value;
            
            const bmr = calculateBMR(gender, currentWeight, height, age);
            const tdee = calculateTDEE(bmr, activityLevel);
            const dailyTarget = calculateDailyTarget(tdee, goal);
            const proteinTarget = Math.round(currentWeight * 2);
            
            userProfile = {
                name,
                gender,
                age,
                height,
                currentWeight,
                targetWeight,
                activityLevel,
                goal,
                BMR: Math.round(bmr),
                TDEE: tdee,
                dailyTarget,
                proteinTarget,
                startDate: new Date().toISOString()
            };
            
            saveProfile();
            
            document.getElementById('onboardingModal').classList.remove('active');
            document.getElementById('dashboard').classList.add('active');
            
            updateDashboard();
            
            // Reset form
            document.getElementById('onboardingForm').reset();
        });

        // ========== THEME TOGGLE ==========
        const themeToggle = document.getElementById('themeToggle');
        const savedTheme = localStorage.getItem('theme') || 'light';

        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggle.classList.add('active');
            themeToggle.querySelector('.theme-toggle-icon').className = 'fas fa-moon theme-toggle-icon';
        }

        themeToggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            this.classList.toggle('active');
            const icon = this.querySelector('.theme-toggle-icon');
            icon.className = newTheme === 'dark' ? 'fas fa-moon theme-toggle-icon' : 'fas fa-sun theme-toggle-icon';
            
            // Update chart colors
            if (weeklyChart) {
                setTimeout(initChart, 300);
            }
        });

        // ========== EVENT LISTENERS ==========
        document.getElementById('addFoodBtn').addEventListener('click', addFood);
        document.getElementById('foodInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') addFood();
        });

        document.getElementById('addExerciseBtn').addEventListener('click', addExercise);

        // ========== INITIALIZATION ==========
        window.addEventListener('DOMContentLoaded', function() {
            loadProfile();
            
            if (userProfile) {
                document.getElementById('onboardingModal').classList.remove('active');
                document.getElementById('dashboard').classList.add('active');
                updateDashboard();
            }
        });