import Script from "next/script";

export const metadata = {
  title: "Latina Uploads Gallery",
  description:
    "Securely browse thumbnails stored in your Latina uploads S3 bucket using Cognito Identity credentials.",
};

const galleryScript = `const gallery=document.getElementById('gallery');
const messageArea=document.getElementById('messageArea');

async function loadGallery(){
  const cognitoPoolId=document.getElementById('cognitoPoolId').value.trim();
  const s3BucketName=document.getElementById('s3BucketName').value.trim();
  const s3Region=document.getElementById('s3Region').value.trim();
  const s3Prefix=document.getElementById('s3Prefix').value.trim();

  if(!cognitoPoolId||!s3BucketName||!s3Region){
    showMessage('Missing configuration. Please verify environment variables.',true);
    return;
  }

  gallery.innerHTML='';
  showMessage('Loading images...',false);

  try{
    const { S3Client, ListObjectsV2Command } = await import('https://js.aws.com/v3-alpha/client-s3/browser/client-s3-es.js');
    const { fromCognitoIdentityPool } = await import('https://js.aws.com/v3-alpha/credential-provider-cognito-identity/browser/credential-provider-cognito-identity-es.js');

    const credentials=fromCognitoIdentityPool({
      clientConfig:{region:s3Region},
      identityPoolId:cognitoPoolId,
    });

    const s3Client=new S3Client({
      region:s3Region,
      credentials,
    });

    const params={Bucket:s3BucketName};
    if(s3Prefix){
      params.Prefix=s3Prefix.endsWith('/')?s3Prefix:s3Prefix+'/';
    }

    const command=new ListObjectsV2Command(params);
    const response=await s3Client.send(command);

    if(!response.Contents||response.Contents.length===0){
      showMessage('No objects found in this bucket/prefix.',false);
      return;
    }

    let imageCount=0;
    response.Contents.forEach((obj)=>{
      const key=obj.Key;
      if(!key||key.endsWith('/')||!/\.(jpg|jpeg|png|gif|webp)$/i.test(key)){
        return;
      }
      imageCount++;
      const s3Url=\`https://\${s3BucketName}.s3.\${s3Region}.amazonaws.com/\${key}\`;
      const imgContainer=document.createElement('div');
      imgContainer.className='relative aspect-square overflow-hidden rounded-lg bg-gray-200 shadow';

      const img=document.createElement('img');
      img.src=s3Url;
      img.alt=key;
      img.className='h-full w-full object-cover object-center transition-transform duration-300 hover:scale-110';
      img.loading='lazy';
      img.onerror=()=>{
        img.alt='Error loading image';
        img.src='https://placehold.co/300x300/ef4444/ffffff?text=Error';
      };

      imgContainer.appendChild(img);
      gallery.appendChild(imgContainer);
    });

    if(imageCount>0){
      showMessage(\`Successfully loaded \${imageCount} images.\`,false);
    }else{
      showMessage('No images found in this bucket/prefix.',false);
    }
  }catch(error){
    console.error('Error listing S3 objects:',error);
    showMessage(\`Error: \${error.message}. Check console and AWS permissions.\`,true);
  }
}

function showMessage(message,isError=false){
  messageArea.textContent=message;
  messageArea.className=isError?'mt-4 text-sm text-red-600':'mt-4 text-sm text-gray-600';
}

window.addEventListener('load',loadGallery);
`;

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <div className="container mx-auto max-w-6xl p-4 md:p-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Latina Uploads Gallery
          </h1>
          <p className="text-gray-600 mb-6">
            Enter your Cognito identity pool and AWS S3 details to securely list
            and view archived uploads. Ensure your IAM and CORS settings allow
            browser access.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label
                htmlFor="cognitoPoolId"
                className="block text-sm font-medium text-gray-700"
              >
                Cognito Pool ID
              </label>
              <input
                type="text"
                id="cognitoPoolId"
                className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 shadow-sm focus:outline-none sm:text-sm"
                value={process.env.NEXT_PUBLIC_COGNITO_POOL_ID || ''}
                readOnly
              />
            </div>
            <div>
              <label
                htmlFor="s3BucketName"
                className="block text-sm font-medium text-gray-700"
              >
                S3 Bucket Name
              </label>
              <input
                type="text"
                id="s3BucketName"
                className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 shadow-sm focus:outline-none sm:text-sm"
                value={process.env.NEXT_PUBLIC_S3_BUCKET || ''}
                readOnly
              />
            </div>
            <div>
              <label
                htmlFor="s3Region"
                className="block text-sm font-medium text-gray-700"
              >
                S3 Region
              </label>
              <input
                type="text"
                id="s3Region"
                className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 shadow-sm focus:outline-none sm:text-sm"
                value={process.env.NEXT_PUBLIC_S3_REGION || ''}
                readOnly
              />
            </div>
          </div>
          <div className="mb-6">
            <label
              htmlFor="s3Prefix"
              className="block text-sm font-medium text-gray-700"
            >
              Optional: Folder / Prefix
            </label>
            <input
              type="text"
              id="s3Prefix"
              className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 shadow-sm focus:outline-none sm:text-sm"
              value={process.env.NEXT_PUBLIC_S3_PREFIX || ''}
              readOnly
            />
          </div>

          <div id="messageArea" className="mt-4 text-sm text-gray-600"></div>
        </div>

        <div
          id="gallery"
          className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
        />
      </div>
      <Script id="gallery-loader" type="module">
        {galleryScript}
      </Script>
    </div>
  );
}
