document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const form = document.getElementById('ippisForm');

    // Salary Calculation Fields
    const basicSalaryInput = document.getElementById('basicSalary');
    const housingAllowanceInput = document.getElementById('housingAllowance');
    const transportAllowanceInput = document.getElementById('transportAllowance');
    const medicalAllowanceInput = document.getElementById('medicalAllowance');
    const otherAllowancesInput = document.getElementById('otherAllowances');
    const taxInput = document.getElementById('tax');
    const pensionInput = document.getElementById('pension');
    const nhfInput = document.getElementById('nhf');

    // Display Fields
    const displayGrossSalary = document.getElementById('displayGrossSalary');
    const displayNetSalary = document.getElementById('displayNetSalary');

    // Salary Calculation Logic
    function calculateSalaries() {
        const basic = parseFloat(basicSalaryInput.value) || 0;
        const housing = parseFloat(housingAllowanceInput.value) || 0;
        const transport = parseFloat(transportAllowanceInput.value) || 0;
        const medical = parseFloat(medicalAllowanceInput.value) || 0;
        const other = parseFloat(otherAllowancesInput.value) || 0;

        const grossSalary = basic + housing + transport + medical + other;

        const tax = parseFloat(taxInput.value) || 0;
        const pension = parseFloat(pensionInput.value) || 0;
        const nhf = parseFloat(nhfInput.value) || 0;

        const netSalary = grossSalary - tax - pension - nhf;

        displayGrossSalary.textContent = grossSalary.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        displayNetSalary.textContent = netSalary.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        return { grossSalary, netSalary };
    }

    // Add event listeners to all salary inputs
    const salaryInputs = [
        basicSalaryInput, housingAllowanceInput, transportAllowanceInput,
        medicalAllowanceInput, otherAllowancesInput, taxInput, pensionInput, nhfInput
    ];

    salaryInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', calculateSalaries);
        }
    });

    // Format currency for display
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 2
        }).format(amount);
    }

    // Format Date string
    function formatPayMonth(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }

    // Handle Form Submission
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!supabase) {
                alert('Database connection not available.');
                return;
            }

            const submitBtn = document.getElementById('submitBtn');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Saving...';
            submitBtn.disabled = true;

            try {
                // Determine salaries
                const { grossSalary, netSalary } = calculateSalaries();

                // Build record object
                const record = {
                    staff_id: document.getElementById('staffId').value,
                    ippis_number: document.getElementById('ippisNumber').value,
                    first_name: document.getElementById('firstName').value,
                    last_name: document.getElementById('lastName').value,
                    department: document.getElementById('department').value,
                    position: document.getElementById('position').value,
                    grade_level: document.getElementById('gradeLevel').value,
                    step: document.getElementById('step').value,
                    bank_name: document.getElementById('bankName').value,
                    account_number: document.getElementById('accountNumber').value,
                    basic_salary: parseFloat(basicSalaryInput.value) || 0,
                    housing_allowance: parseFloat(housingAllowanceInput.value) || 0,
                    transport_allowance: parseFloat(transportAllowanceInput.value) || 0,
                    medical_allowance: parseFloat(medicalAllowanceInput.value) || 0,
                    other_allowances: parseFloat(otherAllowancesInput.value) || 0,
                    tax: parseFloat(taxInput.value) || 0,
                    pension: parseFloat(pensionInput.value) || 0,
                    nhf: parseFloat(nhfInput.value) || 0,
                    gross_salary: grossSalary,
                    net_salary: netSalary,
                    pay_month: document.getElementById('payMonth').value + '-01' // Supabase expects date type
                };

                const { error } = await supabase
                    .from('ippis_records')
                    .insert([record]);

                if (error) throw error;

                alert('IPPIS record saved successfully!');
                form.reset();
                calculateSalaries(); // Reset displays

            } catch (err) {
                console.error('Error saving record:', err);

                if (err.code === '42P01') {
                    alert('Database table "ippis_records" does not exist yet. Please configure the database.');
                } else {
                    alert('Error saving record: ' + err.message);
                }
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});
