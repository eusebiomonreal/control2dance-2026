<?php
/**
 * Plugin Name: EDD Data Exporter (v7 - STRIPE META FINDER)
 * Description: Vuelca TODA la metadata de pedidos Stripe para encontrar los IDs
 * Version: 7.0.0
 */

if (!defined('ABSPATH')) exit;

class EDD_Data_Exporter_V7 {
    
    public function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_post_export_edd_data_v7', [$this, 'handle_export']);
    }
    
    public function add_admin_menu() {
        add_menu_page('EDD Export v7', 'EDD Export v7', 'manage_options', 'edd-data-exporter-v7', [$this, 'admin_page'], 'dashicons-visibility', 100);
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>🔍 Buscador de Meta de Stripe (v7)</h1>
            <p>Este plugin va a volcar TODA la metadata de los últimos 20 pedidos que usaron Stripe para que podamos ver dónde está el ID.</p>
            <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
                <input type="hidden" name="action" value="export_edd_data_v7">
                <?php wp_nonce_field('export_edd_data_v7', 'export_nonce'); ?>
                <?php submit_button('🚀 Buscar Metadata de Stripe'); ?>
            </form>
        </div>
        <?php
    }
    
    public function handle_export() {
        if (!current_user_can('manage_options')) wp_die('Permisos insuficientes');
        check_admin_referer('export_edd_data_v7', 'export_nonce');
        
        $data = [
            'exported_at' => current_time('mysql'),
            'stripe_orders' => $this->get_stripe_orders_meta(20),
        ];
        
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="edd-stripe-meta-v7-' . date('Y-m-d-His') . '.json"');
        echo $json; exit;
    }
    
    private function get_stripe_orders_meta($limit = 20) {
        global $wpdb;
        $results = [];
        
        $orders = $wpdb->get_results("SELECT id, order_number, gateway FROM {$wpdb->prefix}edd_orders WHERE gateway LIKE '%stripe%' ORDER BY id DESC LIMIT $limit");
        
        foreach ($orders as $order) {
            $order_meta = $wpdb->get_results($wpdb->prepare("SELECT meta_key, meta_value FROM {$wpdb->prefix}edd_ordermeta WHERE edd_order_id = %d", $order->id));
            
            $metas = [];
            foreach ($order_meta as $m) {
                $metas[$m->meta_key] = $m->meta_value;
            }

            // También buscar en postmeta
            $post_id = $wpdb->get_var($wpdb->prepare("SELECT meta_value FROM {$wpdb->prefix}edd_ordermeta WHERE edd_order_id = %d AND meta_key = '_edd_payment_id'", $order->id));
            $post_metas = [];
            if ($post_id) {
                $pm = $wpdb->get_results($wpdb->prepare("SELECT meta_key, meta_value FROM {$wpdb->prefix}postmeta WHERE post_id = %d", $post_id));
                foreach ($pm as $m) {
                    $post_metas[$m->meta_key] = $m->meta_value;
                }
            }
            
            $results[] = [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'gateway' => $order->gateway,
                'edd_ordermeta' => $metas,
                'postmeta' => $post_metas
            ];
        }
        return $results;
    }
}
new EDD_Data_Exporter_V7();
