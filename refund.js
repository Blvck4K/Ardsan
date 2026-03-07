// refund.js
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial State Checks
    if (!supabase) {
        showStatus('System error: Database connection failed. Please try again later.', 'error');
        return;
    }

    // 2. DOM Elements
    const refundForm = document.getElementById('refund-form');
    const messageInput = document.getElementById('refund-message');
    const imageInput = document.getElementById('refund-image');
    const imagePreview = document.getElementById('refund-image-preview');
    const submitBtn = document.getElementById('submit-refund-btn');
    const statusDiv = document.getElementById('refund-status');

    // 3. Image Preview Logic
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showStatus('File is too large. Maximum size is 5MB.', 'error');
                imageInput.value = ''; // clear
                imagePreview.style.display = 'none';
                return;
            }

            const reader = new FileReader();
            reader.onload = (evt) => {
                imagePreview.src = evt.target.result;
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            imagePreview.style.display = 'none';
        }
    });

    // 4. Form Submission Logic
    refundForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const message = messageInput.value.trim();
        const file = imageInput.files[0];

        if (!message) {
            showStatus('Please provide a reason for the refund.', 'error');
            return;
        }

        if (!file) {
            showStatus('Please upload an image as evidence.', 'error');
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
            showStatus('Uploading image...', 'info');

            // Get Current User
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) throw new Error("Authentication failed. Please log in again.");

            // Upload Image to Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('refund-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: publicUrlData } = supabase.storage
                .from('refund-images')
                .getPublicUrl(filePath);

            const publicUrl = publicUrlData.publicUrl;

            showStatus('Saving refund request...', 'info');

            // Insert Record
            const { error: insertError } = await supabase
                .from('refunds')
                .insert([{
                    user_email: user.email,
                    message: message,
                    image_url: publicUrl,
                    status: 'pending'
                }]);

            if (insertError) throw insertError;

            // Success
            showStatus('Refund request submitted successfully! The admin will review it shortly.', 'success');
            refundForm.reset();
            imagePreview.style.display = 'none';

            // Redirect after 3 seconds
            setTimeout(() => {
                window.location.href = 'menu.html';
            }, 3000);

        } catch (error) {
            console.error('Submission error:', error);
            showStatus(`Error: ${error.message}`, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Submit Request <i class="fa-solid fa-paper-plane"></i>';
        }
    });

    // Helper: Show Status Message
    function showStatus(text, type) {
        statusDiv.textContent = text;
        if (type === 'error') {
            statusDiv.style.color = '#dc3545';
        } else if (type === 'success') {
            statusDiv.style.color = '#28a745';
        } else {
            statusDiv.style.color = '#17a2b8'; // info
        }
    }
});
