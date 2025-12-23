import imgBye1 from "figma:asset/69016b785a95b70274a29989f55bf1fada31e528.png";

function Logo() {
  return (
    <div className="relative shrink-0 size-[70px]" data-name="logo">
      <img 
        alt="VINUS Logo" 
        className="size-full object-cover" 
        src="https://www.vinus.co.kr/project/link_resource/images/logo_black.png" 
      />
    </div>
  );
}

function Txt() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start leading-[normal] not-italic relative shrink-0 text-nowrap w-full" data-name="txt_01">
      <p className="font-['Pretendard:SemiBold',sans-serif] relative shrink-0 text-[#222] text-[20px] tracking-[-0.5px]">example@example.com</p>
      <p className="capitalize font-['Pretendard:ExtraBold',sans-serif] relative shrink-0 text-[#222] text-[24px] tracking-[-0.5px]">수신거부 처리가 완료되었습니다.</p>
      <div className="capitalize font-['Pretendard:Regular',sans-serif] relative shrink-0 text-[#a8adb4] text-[12px]">
        <p className="mb-0">원하지 않는 메일로 불편을 드렸다면 죄송합니다.</p>
        <p>귀사의 무한한 발전을 기원하겠습니다.</p>
      </div>
      <p className="capitalize font-['Pretendard:Regular',sans-serif] relative shrink-0 text-[#222] text-[12px]">감사합니다.</p>
    </div>
  );
}

function Cont() {
  return (
    <div className="content-stretch flex flex-col gap-[10px] items-start relative shrink-0" data-name="cont">
      <Logo />
      <div className="relative shrink-0 size-[160px]" data-name="bye 1">
        <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none size-full" src={imgBye1} />
      </div>
      <Txt />
    </div>
  );
}

export default function MailForm() {
  return (
    <div className="bg-white relative size-full" data-name="mail form">
      <div className="flex flex-col items-center justify-center size-full">
        <div className="content-stretch flex flex-col items-center justify-center p-[32px] relative size-full">
          <Cont />
        </div>
      </div>
    </div>
  );
}