# Headshot Generator Model

This is a Stable Diffusion based headshot generation model that creates professional headshots using the Stable Diffusion v1.5 base model.

## Model Details

- Base Model: Stable Diffusion v1.5
- Input: Text prompt describing the desired headshot
- Output: Generated headshot image (PNG format)

## Local Development

### Prerequisites

- Install Cog: `curl -o /usr/local/bin/cog -L https://github.com/replicate/cog/releases/latest/download/cog_$(uname -s)_$(uname -m)`
- Make sure you have Docker installed and running
- NVIDIA GPU with CUDA support (recommended)

### Development Scripts

For local development, you can use the following npm scripts:

- `npm run dev` - Start the development server
- `npm run dev:server` - Start the server with nodemon for automatic restart on file changes
- `npm run build` - Build the project for production
- `npm run start` - Start the production server

The `dev:server` script is particularly useful during backend development as it automatically restarts the server when you make changes to server-side files, ensuring your changes are immediately reflected without manual restarts.

### Testing Locally

1. Clone this repository
2. Run `cog predict -i prompt="professional headshot of a person in business attire"`

### Pushing to Replicate

#### Option 1: Web Interface (Recommended)

1. Go to https://replicate.com/create to create a new model
2. Fill in the following details:
   - Model name: headshotgen
   - Description: Professional headshot generator using Stable Diffusion
   - GitHub repository: (if you have one)
3. Get your API token from https://replicate.com/account/api-tokens
4. Use the Replicate API to push your model:

   ```python
   import replicate

   # Set your API token
   replicate.api_token = "your_token_here"

   # Push the model
   model = replicate.models.create(
       owner="mattcovi",
       name="headshotgen",
       visibility="public"
   )
   ```

#### Option 2: Using Cog CLI

1. Install Cog and authenticate:

```bash
cog login
```

2. Push the model:

```bash
cog push r8.im/mattcovi/headshotgen
```

## Model Configuration

The model is configured in `cog.yaml` and uses the following dependencies:

- torch==2.1.0
- transformers==4.36.0
- diffusers==0.24.0
- accelerate==0.25.0

## Troubleshooting

If you encounter graphics-related errors (e.g., "vkCreateInstance failed" or "Disabled hardware acceleration"):

- These errors typically occur in headless environments
- Use the Web Interface deployment method (Option 1) instead
- If using Cog CLI is required, ensure you're running on a machine with proper GPU and graphics support

## Managing Your Model

Once your model is deployed, you can:

1. View your model at https://replicate.com/[username]/headshotgen
2. Test the model with different prompts through the web interface:
   - Try various professional settings: "professional headshot with neutral background"
   - Experiment with lighting: "studio lighting with soft focus"
   - Test different poses: "looking directly at camera with confident smile"
3. Monitor usage and performance metrics in your dashboard
4. Update model settings and visibility (public/private)
5. Share your model with others using the public URL
6. Access API documentation for integration with your applications

### Example API Usage

After deployment, you can use the model programmatically:

```python
import replicate

# Replace with your API token
api = replicate.Client(api_token="your_token_here")

# Run the model
output = api.run(
    "mattcovi/headshotgen",
    input={
        "prompt": "professional headshot of a person in business attire",
        "negative_prompt": "blurry, distorted, low quality",
        "num_inference_steps": 50,
        "guidance_scale": 7.5
    }
)

# Output will be a URL to the generated image
print(f"Generated image URL: {output}")
```
