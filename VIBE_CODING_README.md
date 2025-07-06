# Vibe Coding Studio

## Overview

This vibe-coding application allows users to upload product screen images and convert them into React code using AI. Users can then use a chat interface to iteratively modify and refine their generated code.

## Features

### 🏗️ Project & Screen Management
- **Hierarchical Structure**: Projects → Screens → Vibe-coding Sessions
- **Project Creation**: Create and manage multiple projects
- **Screen Upload**: Upload screen images for code generation
- **Status Tracking**: Monitor processing status (processing, ready, error)

### 🤖 Image-to-Code Generation
- **AI-Powered Conversion**: Automatically convert uploaded screen images to React code
- **Multi-Step Processing**: 
  1. Analyzing image structure
  2. Identifying UI components
  3. Generating initial code
  4. Optimizing and refining
- **Confidence Scoring**: AI provides confidence levels for generated code
- **Material-UI Components**: Generated code uses Material-UI for modern designs

### 💬 Vibe Chat Interface
- **Interactive Modifications**: Chat with AI to modify your generated screens
- **Natural Language**: Describe changes in plain English
- **Code Iterations**: Accept/reject code changes with version tracking
- **Real-time Updates**: See changes applied immediately

### 📊 Database Schema
The application uses Supabase with the following tables:

- **projects**: Store user projects
- **screens**: Store uploaded images and generated code
- **vibe_sessions**: Store chat history and code iterations
- **app_config**: Store application configuration

## How to Use

### 1. Create a Project
- Click "New Project" in the top header
- Enter project name and optional description
- Start organizing your screens by project

### 2. Upload Screen Images
- Select a project from the sidebar
- Click "Upload Screen" button
- Choose an image file and provide a screen name
- The AI will automatically start processing

### 3. Monitor Processing
- Watch the step-by-step processing progress
- View confidence scores and iteration counts
- Processing typically takes 30-60 seconds

### 4. Vibe-Code Your Screen
- Once processing is complete, select a screen
- Go to the "Vibe Chat" tab
- Start describing changes you want to make:
  - "Change the button colors to blue"
  - "Make the layout more responsive"
  - "Add a search bar to the header"

### 5. Accept/Reject Changes
- Review AI-generated code changes
- Accept changes you like to update your screen
- Reject and try different approaches if needed

### 6. View Generated Code
- Go to the "Code Preview" tab
- Copy the generated React code
- Use it in your own projects

## Technical Implementation

### Frontend Stack
- **React 18** with TypeScript
- **Material-UI (MUI)** for components
- **Refine Framework** for data management
- **React Router** for navigation

### Backend Integration
- **Supabase** for database and storage
- **Row Level Security (RLS)** for data protection
- **Real-time subscriptions** for live updates

### Key Components

#### `VibecodingInterface` (Main Component)
- Project management sidebar
- Screen grid with status indicators
- Tabbed interface for different views
- Upload and creation dialogs

#### `VibeChatInterface`
- Chat UI for AI interactions
- Message history display
- Code acceptance/rejection workflow
- Real-time AI processing

#### `ImageToCodeProcessor`
- Step-by-step processing visualization
- Progress tracking and error handling
- Automatic screen status updates

## Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Supabase**
   - Update `src/utility/supabaseClient.ts` with your Supabase credentials
   - Run the SQL schema from the Orders Document

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Access the Application**
   - Open http://localhost:3000
   - Login with your credentials
   - Navigate to the /main route

## Future Enhancements

### Planned Features
- **Real AI Integration**: Replace mock AI with actual image-to-code APIs
- **Code Preview**: Live preview of generated components
- **Export Options**: Download generated code as files
- **Template Library**: Pre-built component templates
- **Collaboration**: Share projects with team members
- **Version Control**: Advanced code versioning and branching

### AI Provider Integration
The current implementation uses mock AI responses. To integrate real AI:

1. **Replace `simulateAIResponse` in `VibeChatInterface`**
2. **Add actual image-to-code API calls in `ImageToCodeProcessor`**
3. **Implement providers like GPT-4V, Claude Vision, etc.**

## Database Schema Details

### Projects Table
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Screens Table
```sql
CREATE TABLE screens (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  original_image_url TEXT NOT NULL,
  original_image_path TEXT NOT NULL,
  current_code TEXT,
  status TEXT DEFAULT 'processing',
  iteration_count INTEGER DEFAULT 0,
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Vibe Sessions Table
```sql
CREATE TABLE vibe_sessions (
  id UUID PRIMARY KEY,
  screen_id UUID REFERENCES screens(id),
  session_type TEXT DEFAULT 'chat',
  user_prompt TEXT,
  ai_response TEXT,
  generated_code TEXT,
  ai_provider TEXT,
  confidence_score DECIMAL(3,2),
  is_accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

---

**Happy Vibe-Coding! 🎨✨** 