import React from 'react';
import { LiveProvider, LiveEditor, LiveError, LivePreview as ReactLivePreview } from 'react-live';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Avatar,
  Chip,
  TextField,
  Grid,
  Stack,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Divider,
  Switch,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  Checkbox,
  Select,
  MenuItem,
  InputLabel,
  Alert,
  CircularProgress,
  LinearProgress,
  Skeleton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Tooltip,
  Badge,
  AppBar,
  Toolbar,
  Drawer,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  BottomNavigation,
  BottomNavigationAction,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Fab,
  Pagination,
  Rating,
  Slider,
  Breadcrumbs,
  Link,
  Menu,
  MenuList,
  MenuItem as MenuItemComponent,
  Popover,
  Popper
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Home as HomeIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Favorite as FavoriteIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Menu as MenuIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Send as SendIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationOnIcon,
  Schedule as ScheduleIcon,
  Event as EventIcon,
  ShoppingCart as ShoppingCartIcon,
  Payment as PaymentIcon,
  CreditCard as CreditCardIcon,
  AccountBalance as AccountBalanceIcon,
  Security as SecurityIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  Dashboard as DashboardIcon,
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowLeft as KeyboardArrowLeftIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon
} from '@mui/icons-material';

interface LivePreviewProps {
  code: string;
  showEditor?: boolean;
  height?: number;
}

const LivePreview: React.FC<LivePreviewProps> = ({ 
  code, 
  showEditor = false, 
  height = 400 
}) => {
  // Create a comprehensive scope with all Material-UI components and icons
  const scope = {
    React,
    useState: React.useState,
    useEffect: React.useEffect,
    useCallback: React.useCallback,
    useMemo: React.useMemo,
    useRef: React.useRef,
    
    // Material-UI Components
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    IconButton,
    Avatar,
    Chip,
    TextField,
    Grid,
    Stack,
    Paper,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    ListItemButton,
    Divider,
    Switch,
    FormControlLabel,
    Radio,
    RadioGroup,
    FormControl,
    FormLabel,
    Checkbox,
    Select,
    MenuItem,
    InputLabel,
    Alert,
    CircularProgress,
    LinearProgress,
    Skeleton,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
    Tooltip,
    Badge,
    AppBar,
    Toolbar,
    Drawer,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    BottomNavigation,
    BottomNavigationAction,
    SpeedDial,
    SpeedDialAction,
    SpeedDialIcon,
    Fab,
    Pagination,
    Rating,
    Slider,
    Breadcrumbs,
    Link,
    Menu,
    MenuList,
    Popover,
    Popper,
    
    // Material-UI Icons
    ArrowBackIcon,
    CheckCircleIcon,
    CloseIcon,
    AddIcon,
    RemoveIcon,
    EditIcon,
    DeleteIcon,
    SearchIcon,
    HomeIcon,
    PersonIcon,
    SettingsIcon,
    FavoriteIcon,
    ShareIcon,
    DownloadIcon,
    UploadIcon,
    VisibilityIcon,
    VisibilityOffIcon,
    ThumbUpIcon,
    ThumbDownIcon,
    StarIcon,
    StarBorderIcon,
    MenuIcon,
    MoreVertIcon,
    RefreshIcon,
    SaveIcon,
    SendIcon,
    PhoneIcon,
    EmailIcon,
    LocationOnIcon,
    ScheduleIcon,
    EventIcon,
    ShoppingCartIcon,
    PaymentIcon,
    CreditCardIcon,
    AccountBalanceIcon,
    SecurityIcon,
    LockIcon,
    LockOpenIcon,
    NotificationsIcon,
    NotificationsOffIcon,
    DashboardIcon,
    AnalyticsIcon,
    TrendingUpIcon,
    TrendingDownIcon,
    ExpandMoreIcon,
    ExpandLessIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    KeyboardArrowUpIcon,
    KeyboardArrowDownIcon,
    KeyboardArrowLeftIcon,
    KeyboardArrowRightIcon,
  };

  // Clean up the code to extract just the component
  const cleanCode = extractComponentCode(code);

  return (
    <Box>
      <LiveProvider code={cleanCode} scope={scope} noInline={true}>
        <Box sx={{ 
          border: '1px solid #e0e0e0', 
          borderRadius: 1,
          overflow: 'hidden'
        }}>
          {/* Live Preview */}
          <Box sx={{ 
            minHeight: height, 
            backgroundColor: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
                         <Paper sx={{ 
               width: '100%', 
               height: '100%',
               overflow: 'auto',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center'
             }}>
               <ReactLivePreview />
             </Paper>
          </Box>
          
          {/* Error Display */}
          <LiveError 
            style={{
              backgroundColor: '#ffebee',
              color: '#c62828',
              padding: '12px',
              margin: 0,
              borderTop: '1px solid #e0e0e0',
              fontSize: '14px',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap'
            }}
          />
          
          {/* Code Editor (optional) */}
          {showEditor && (
            <Box sx={{ borderTop: '1px solid #e0e0e0' }}>
              <LiveEditor 
                style={{
                  fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                  fontSize: '14px',
                  backgroundColor: '#1e1e1e',
                  color: '#d4d4d4',
                  padding: '16px',
                  minHeight: '200px',
                  overflow: 'auto'
                }}
              />
            </Box>
          )}
        </Box>
      </LiveProvider>
    </Box>
  );
};

// Helper function to extract and clean the component code
const extractComponentCode = (code: string): string => {
  try {
    console.log('🧹 [LIVE-PREVIEW] Cleaning code, original length:', code.length);
    
    // Remove all import statements
    let cleanCode = code
      .replace(/^import\s+.*?from\s+['"][^'"]*['"];\s*$/gm, '')
      .replace(/^import\s+['"][^'"]*['"];\s*$/gm, '')
      .replace(/^import\s*{[^}]*}\s*from\s*['"][^'"]*['"];\s*$/gm, '')
      .trim();

    // Remove export statements
    cleanCode = cleanCode
      .replace(/^export\s+default\s+/gm, '')
      .replace(/^export\s*{[^}]*};\s*$/gm, '')
      .replace(/^export\s+/gm, '')
      .trim();

    // Remove any remaining module.exports or exports references
    cleanCode = cleanCode
      .replace(/module\.exports\s*=\s*/g, '')
      .replace(/exports\.\w+\s*=\s*/g, '')
      .trim();

    console.log('🧹 [LIVE-PREVIEW] After cleaning, length:', cleanCode.length);
    
    // Ensure the component is exported for rendering
    if (!cleanCode.includes('render(')) {
      // Find the component name - try different patterns
      let componentName = null;
      
      // Pattern 1: const ComponentName = () => { ... }
      let match = cleanCode.match(/const\s+(\w+)\s*=\s*\(\s*\)\s*=>/);
      if (match) {
        componentName = match[1];
      } else {
        // Pattern 2: const ComponentName = function() { ... }
        match = cleanCode.match(/const\s+(\w+)\s*=\s*function/);
        if (match) {
          componentName = match[1];
        } else {
          // Pattern 3: function ComponentName() { ... }
          match = cleanCode.match(/function\s+(\w+)\s*\(/);
          if (match) {
            componentName = match[1];
          }
        }
      }

      if (componentName) {
        console.log('🎯 [LIVE-PREVIEW] Found component:', componentName);
        cleanCode += `\n\nrender(<${componentName} />);`;
      } else {
        console.log('⚠️ [LIVE-PREVIEW] Could not find component name, using fallback');
        // Fallback: try to extract JSX and render it directly
        const jsxMatch = cleanCode.match(/return\s*\(\s*([\s\S]*?)\s*\);?\s*};\s*$/);
        if (jsxMatch) {
          const jsxContent = jsxMatch[1];
          cleanCode = `
const PreviewComponent = () => (
  ${jsxContent}
);

render(<PreviewComponent />);`;
        } else {
          // Last resort: show error with code snippet
          cleanCode = `
const PreviewComponent = () => (
  <Box sx={{ p: 2, border: '1px solid #ccc', borderRadius: 1 }}>
    <Typography variant="h6" color="error">Could not parse component</Typography>
    <Typography variant="body2" sx={{ mt: 1 }}>
      Component name not found. Check the console for details.
    </Typography>
    <pre style={{fontSize: '10px', whiteSpace: 'pre-wrap', maxHeight: '200px', overflow: 'auto'}}>
      ${code.slice(0, 500)}...
    </pre>
  </Box>
);

render(<PreviewComponent />);`;
        }
      }
    }

    console.log('✅ [LIVE-PREVIEW] Final code preview:', cleanCode.slice(0, 200) + '...');
    return cleanCode;
  } catch (error) {
    console.error('❌ [LIVE-PREVIEW] Error cleaning code:', error);
    return `
const ErrorComponent = () => (
  <Box sx={{ p: 2, border: '2px solid red', borderRadius: 1, bgcolor: '#ffebee' }}>
    <Typography variant="h6" color="error">Preview Error</Typography>
    <Typography variant="body2" sx={{ mt: 1 }}>
      Could not render the generated code: ${error instanceof Error ? error.message : 'Unknown error'}
    </Typography>
  </Box>
);

render(<ErrorComponent />);`;
  }
};

export default LivePreview; 