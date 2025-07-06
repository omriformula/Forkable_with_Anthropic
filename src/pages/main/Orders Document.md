I want to build a functionality which will allow the user to upload product screens images of screens the user would like to start vibe-coding on.

The most important thing for us right now, is to build the functionality that would allow our app to build the screen, using image-to-code, as accurately as possible.

After that we would like to enable the user to use the chat interface to vibe-code and change and modify the screen.

Let’s start with create a top header component for the interface of the user that allows them to create and access, under each there will be the saved screens, and under each screen there will be the vibe-coding history. I would like the hierarchy to be project-\>screens-\>vibe-coding history and states recovery (per-screen). Supabase already have the right table to support this.

Following is the Supebase SQL I used to create the right table, for your context:  
\-- Enhanced schema for vibe-coding application  
\-- Hierarchy: Users \-\> Projects \-\> Screens \-\> Vibe-coding Sessions

\-- Projects table  
CREATE TABLE projects (  
 id UUID DEFAULT gen\_random\_uuid() PRIMARY KEY,  
 user\_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  
 name TEXT NOT NULL,  
 description TEXT,  
 created\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  
 updated\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  
);

\-- Screens table  
CREATE TABLE screens (  
 id UUID DEFAULT gen\_random\_uuid() PRIMARY KEY,  
 project\_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,  
 name TEXT NOT NULL,  
 original\_image\_url TEXT NOT NULL, \-- Supabase Storage URL  
 original\_image\_path TEXT NOT NULL, \-- Storage path for deletion  
 current\_code TEXT, \-- Latest generated React component code  
 current\_preview\_url TEXT, \-- URL for current preview (if needed)  
 status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'iterating', 'ready', 'error')),  
 iteration\_count INTEGER DEFAULT 0,  
 confidence\_score DECIMAL(3,2), \-- 0.00 to 1.00  
 created\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  
 updated\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  
);

\-- Vibe-coding sessions (conversation history per screen)  
CREATE TABLE vibe\_sessions (  
 id UUID DEFAULT gen\_random\_uuid() PRIMARY KEY,  
 screen\_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,  
 session\_type TEXT DEFAULT 'chat' CHECK (session\_type IN ('initial\_generation', 'iteration', 'chat', 'refinement')),  
 user\_prompt TEXT, \-- User's request/message  
 ai\_response TEXT, \-- AI's response  
 generated\_code TEXT, \-- Code generated in this session  
 ai\_provider TEXT, \-- 'gpt4v', 'claude', 'hybrid'  
 confidence\_score DECIMAL(3,2), \-- Confidence for this iteration  
 is\_accepted BOOLEAN DEFAULT false, \-- Whether user accepted this iteration  
 created\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  
);

\-- App configuration (for editable parameters)  
CREATE TABLE app\_config (  
 id UUID DEFAULT gen\_random\_uuid() PRIMARY KEY,  
 key TEXT UNIQUE NOT NULL,  
 value JSONB NOT NULL,  
 description TEXT,  
 updated\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  
);

\-- Insert default configuration values  
INSERT INTO app\_config (key, value, description) VALUES  
('max\_iterations', '3', 'Maximum number of automatic iterations for image-to-code generation'),  
('confidence\_threshold', '0.85', 'Minimum confidence score to consider generation complete'),  
('ai\_providers', '{"primary": "hybrid", "fallback": "claude"}', 'AI provider configuration'),  
('iteration\_delay', '2000', 'Delay between iterations in milliseconds');

\-- Row Level Security (RLS) Policies

\-- Projects: Users can only see their own projects  
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;  
CREATE POLICY "Users can view their own projects" ON projects FOR SELECT USING (auth.uid() \= user\_id);  
CREATE POLICY "Users can insert their own projects" ON projects FOR INSERT WITH CHECK (auth.uid() \= user\_id);  
CREATE POLICY "Users can update their own projects" ON projects FOR UPDATE USING (auth.uid() \= user\_id);  
CREATE POLICY "Users can delete their own projects" ON projects FOR DELETE USING (auth.uid() \= user\_id);

\-- Screens: Users can only see screens from their projects  
ALTER TABLE screens ENABLE ROW LEVEL SECURITY;  
CREATE POLICY "Users can view screens from their projects" ON screens FOR SELECT  
 USING (EXISTS (SELECT 1 FROM projects WHERE projects.id \= screens.project\_id AND projects.user\_id \= auth.uid()));  
CREATE POLICY "Users can insert screens to their projects" ON screens FOR INSERT  
 WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id \= screens.project\_id AND projects.user\_id \= auth.uid()));  
CREATE POLICY "Users can update screens from their projects" ON screens FOR UPDATE  
 USING (EXISTS (SELECT 1 FROM projects WHERE projects.id \= screens.project\_id AND projects.user\_id \= auth.uid()));  
CREATE POLICY "Users can delete screens from their projects" ON screens FOR DELETE  
 USING (EXISTS (SELECT 1 FROM projects WHERE projects.id \= screens.project\_id AND projects.user\_id \= auth.uid()));

\-- Vibe sessions: Users can only see sessions from their screens  
ALTER TABLE vibe\_sessions ENABLE ROW LEVEL SECURITY;  
CREATE POLICY "Users can view sessions from their screens" ON vibe\_sessions FOR SELECT  
 USING (EXISTS (  
   SELECT 1 FROM screens  
   JOIN projects ON projects.id \= screens.project\_id  
   WHERE screens.id \= vibe\_sessions.screen\_id AND projects.user\_id \= auth.uid()  
 ));  
CREATE POLICY "Users can insert sessions to their screens" ON vibe\_sessions FOR INSERT  
 WITH CHECK (EXISTS (  
   SELECT 1 FROM screens  
   JOIN projects ON projects.id \= screens.project\_id  
   WHERE screens.id \= vibe\_sessions.screen\_id AND projects.user\_id \= auth.uid()  
 ));  
CREATE POLICY "Users can update sessions from their screens" ON vibe\_sessions FOR UPDATE  
 USING (EXISTS (  
   SELECT 1 FROM screens  
   JOIN projects ON projects.id \= screens.project\_id  
   WHERE screens.id \= vibe\_sessions.screen\_id AND projects.user\_id \= auth.uid()  
 ));  
CREATE POLICY "Users can delete sessions from their screens" ON vibe\_sessions FOR DELETE  
 USING (EXISTS (  
   SELECT 1 FROM screens  
   JOIN projects ON projects.id \= screens.project\_id  
   WHERE screens.id \= vibe\_sessions.screen\_id AND projects.user\_id \= auth.uid()  
 ));

\-- App config: Read-only for all authenticated users (you can modify via direct DB access)  
ALTER TABLE app\_config ENABLE ROW LEVEL SECURITY;  
CREATE POLICY "Authenticated users can read app config" ON app\_config FOR SELECT TO authenticated USING (true);

\-- Storage bucket for screen images  
INSERT INTO storage.buckets (id, name, public) VALUES ('screen-images', 'screen-images', false);

\-- Storage policy: Users can only access their own images  
CREATE POLICY "Users can upload their own images" ON storage.objects FOR INSERT  
 WITH CHECK (bucket\_id \= 'screen-images' AND auth.uid()::text \= (storage.foldername(name))\[1\]);  
CREATE POLICY "Users can view their own images" ON storage.objects FOR SELECT  
 USING (bucket\_id \= 'screen-images' AND auth.uid()::text \= (storage.foldername(name))\[1\]);  
CREATE POLICY "Users can delete their own images" ON storage.objects FOR DELETE  
 USING (bucket\_id \= 'screen-images' AND auth.uid()::text \= (storage.foldername(name))\[1\]);

\-- Indexes for performance  
CREATE INDEX idx\_projects\_user\_id ON projects(user\_id);  
CREATE INDEX idx\_screens\_project\_id ON screens(project\_id);  
CREATE INDEX idx\_screens\_status ON screens(status);  
CREATE INDEX idx\_vibe\_sessions\_screen\_id ON vibe\_sessions(screen\_id);  
CREATE INDEX idx\_vibe\_sessions\_created\_at ON vibe\_sessions(created\_at);

\-- Functions for updating timestamps  
CREATE OR REPLACE FUNCTION update\_updated\_at\_column()  
RETURNS TRIGGER AS $$  
BEGIN  
   NEW.updated\_at \= NOW();  
   RETURN NEW;  
END;  
$$ language 'plpgsql';

\-- Triggers for auto-updating timestamps  
CREATE TRIGGER update\_projects\_updated\_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update\_updated\_at\_column();  
CREATE TRIGGER update\_screens\_updated\_at BEFORE UPDATE ON screens FOR EACH ROW EXECUTE FUNCTION update\_updated\_at\_column();  
CREATE TRIGGER update\_app\_config\_updated\_at BEFORE UPDATE ON app\_config FOR EACH ROW EXECUTE FUNCTION update\_updated\_at\_column();  
